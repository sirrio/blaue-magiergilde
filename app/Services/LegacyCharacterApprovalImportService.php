<?php

namespace App\Services;

use App\Models\LegacyCharacterApproval;
use App\Support\DndBeyondCharacterLink;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class LegacyCharacterApprovalImportService
{
    /**
     * @return array{
     *     summary: array{total_rows:int,new_rows:int,updated_rows:int,unchanged_rows:int,invalid_rows:int},
     *     row_samples: array<int, array<string, mixed>>,
     *     error_samples: array<int, array<string, mixed>>,
     *     import_rows: array<int, array<string, mixed>>
     * }
     */
    public function preview(UploadedFile $file): array
    {
        [$headers, $rows, $headerLine] = $this->readCsvRows($file);
        $requiredHeaders = ['neuer_discordname', 'spieler', 'zimmer', 'bt', 'lt', 'ht', 'et'];
        $missingHeaders = array_values(array_diff($requiredHeaders, $headers));

        if ($missingHeaders !== []) {
            return [
                'summary' => [
                    'total_rows' => 0,
                    'new_rows' => 0,
                    'updated_rows' => 0,
                    'unchanged_rows' => 0,
                    'invalid_rows' => 1,
                ],
                'row_samples' => [],
                'error_samples' => [[
                    'line' => $headerLine ?? 1,
                    'message' => 'Missing required headers: '.implode(', ', $missingHeaders),
                ]],
                'import_rows' => [],
            ];
        }

        $summary = [
            'total_rows' => 0,
            'new_rows' => 0,
            'updated_rows' => 0,
            'unchanged_rows' => 0,
            'invalid_rows' => 0,
        ];
        $rowSamples = [];
        $errorSamples = [];
        $importRows = [];
        $seenCharacterIds = [];

        foreach ($rows as $rowData) {
            $sourceRow = (int) $rowData['line'];
            /** @var array<string, string> $row */
            $row = $rowData['row'];
            $discordName = $this->nullableString($row['neuer_discordname'] ?? null);
            $playerName = $this->nullableString($row['spieler'] ?? null);
            $room = $this->nullableString($row['zimmer'] ?? null);

            foreach (['bt', 'lt', 'ht', 'et'] as $tier) {
                $entries = preg_split('/\r\n|\r|\n/u', (string) ($row[$tier] ?? '')) ?: [];

                foreach ($entries as $entry) {
                    $normalizedEntry = trim($entry);
                    if ($normalizedEntry === '') {
                        continue;
                    }

                    $summary['total_rows']++;

                    [$payload, $errors] = $this->normalizeEntry(
                        $normalizedEntry,
                        $tier,
                        $sourceRow,
                        $discordName,
                        $playerName,
                        $room,
                    );

                    if ($payload === null) {
                        $summary['invalid_rows']++;
                        if (count($errorSamples) < 20) {
                            $errorSamples[] = [
                                'line' => $sourceRow,
                                'message' => implode(' | ', $errors),
                            ];
                        }

                        continue;
                    }

                    $characterId = (int) $payload['dndbeyond_character_id'];
                    if (isset($seenCharacterIds[$characterId])) {
                        $summary['invalid_rows']++;
                        if (count($errorSamples) < 20) {
                            $errorSamples[] = [
                                'line' => $sourceRow,
                                'message' => "Duplicate D&D Beyond character id '{$characterId}' in import file.",
                            ];
                        }

                        continue;
                    }

                    $seenCharacterIds[$characterId] = true;

                    [$action, $existingId, $changes] = $this->determineAction($payload);
                    $summary["{$action}_rows"]++;

                    $importRows[] = [
                        'line' => $sourceRow,
                        'action' => $action,
                        'payload' => $payload,
                        'existing_id' => $existingId,
                    ];

                    $rowSamples[] = [
                        'line' => $sourceRow,
                        'action' => $action,
                        'payload' => $payload,
                        'changes' => $changes,
                    ];
                }
            }
        }

        return [
            'summary' => $summary,
            'row_samples' => $rowSamples,
            'error_samples' => $errorSamples,
            'import_rows' => $importRows,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $importRows
     * @return array{total_rows:int,new_rows:int,updated_rows:int,unchanged_rows:int,invalid_rows:int}
     */
    public function apply(array $importRows): array
    {
        $summary = [
            'total_rows' => count($importRows),
            'new_rows' => 0,
            'updated_rows' => 0,
            'unchanged_rows' => 0,
            'invalid_rows' => 0,
        ];

        if ($importRows === []) {
            return $summary;
        }

        $rowsToInsert = [];

        foreach ($importRows as $importRow) {
            $payload = is_array($importRow['payload'] ?? null) ? $importRow['payload'] : null;
            $action = (string) ($importRow['action'] ?? '');

            if (! is_array($payload) || ! in_array($action, ['new', 'updated', 'unchanged'], true)) {
                $summary['invalid_rows']++;

                continue;
            }

            $summary["{$action}_rows"]++;
            $rowsToInsert[] = array_merge($payload, [
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::transaction(function () use ($rowsToInsert) {
            LegacyCharacterApproval::query()->delete();

            foreach (array_chunk($rowsToInsert, 250) as $chunk) {
                LegacyCharacterApproval::query()->insert($chunk);
            }
        });

        return $summary;
    }

    /**
     * @return array{0: array<int, string>, 1: array<int, array{line:int,row:array<string,string>}>, 2:int|null}
     */
    private function readCsvRows(UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'rb');
        if ($handle === false) {
            return [[], [], null];
        }

        $requiredHeaders = ['neuer_discordname', 'spieler', 'zimmer', 'bt', 'lt', 'ht', 'et'];
        $headers = [];
        $rows = [];
        $headerLine = null;
        $line = 0;

        while (($row = fgetcsv($handle)) !== false) {
            $line++;
            if (! is_array($row)) {
                continue;
            }

            $normalizedValues = array_map(fn ($value) => trim((string) $value), $row);

            if ($headers === []) {
                $candidateHeaders = array_values(array_map(fn ($value) => $this->normalizeHeader($value), $normalizedValues));
                if (count(array_intersect($requiredHeaders, $candidateHeaders)) === count($requiredHeaders)) {
                    $headers = $candidateHeaders;
                    $headerLine = $line;
                }

                continue;
            }

            if (count(array_filter($normalizedValues, fn ($value) => $value !== '')) === 0) {
                continue;
            }

            $mapped = [];
            foreach ($headers as $index => $header) {
                if ($header === '') {
                    continue;
                }

                $mapped[$header] = $normalizedValues[$index] ?? '';
            }

            $rows[] = [
                'line' => $line,
                'row' => $mapped,
            ];
        }

        fclose($handle);

        return [$headers, $rows, $headerLine];
    }

    private function normalizeHeader(string $header): string
    {
        $normalized = trim($header);
        $normalized = preg_replace('/^\xEF\xBB\xBF/u', '', $normalized) ?? $normalized;
        $normalized = strtolower($normalized);

        return preg_replace('/[^a-z0-9]+/u', '_', $normalized) ?? $normalized;
    }

    /**
     * @return array{0: array<string, mixed>|null, 1: array<int, string>}
     */
    private function normalizeEntry(
        string $entry,
        string $tier,
        int $sourceRow,
        ?string $discordName,
        ?string $playerName,
        ?string $room,
    ): array {
        if (! preg_match('/^\s*(.+?)\s*:\s*(https?:\/\/\S+)\s*$/u', $entry, $matches)) {
            return [null, ["Could not parse '{$entry}'. Expected 'Name: https://www.dndbeyond.com/characters/...'."]];
        }

        $characterName = trim((string) ($matches[1] ?? ''));
        $externalLink = trim((string) ($matches[2] ?? ''));
        $characterId = DndBeyondCharacterLink::extractId($externalLink);

        if ($characterName === '') {
            return [null, ['Character name is required.']];
        }

        if ($characterId === null) {
            return [null, ["Invalid D&D Beyond character link '{$externalLink}'."]];
        }

        return [[
            'discord_name' => $discordName,
            'player_name' => $playerName,
            'room' => $room,
            'tier' => $tier,
            'character_name' => $characterName,
            'external_link' => $externalLink,
            'dndbeyond_character_id' => $characterId,
            'source_row' => $sourceRow,
            'source_column' => $tier,
        ], []];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{0: 'new'|'updated'|'unchanged', 1:int|null, 2:array<string, array{from:mixed,to:mixed}>}
     */
    private function determineAction(array $payload): array
    {
        $existing = LegacyCharacterApproval::query()
            ->where('dndbeyond_character_id', $payload['dndbeyond_character_id'])
            ->first();

        if (! $existing) {
            return ['new', null, []];
        }

        $changes = [];
        foreach (['discord_name', 'player_name', 'room', 'tier', 'character_name', 'external_link', 'source_row', 'source_column'] as $field) {
            if ($existing->{$field} !== $payload[$field]) {
                $changes[$field] = [
                    'from' => $existing->{$field},
                    'to' => $payload[$field],
                ];
            }
        }

        if ($changes === []) {
            return ['unchanged', $existing->id, []];
        }

        return ['updated', $existing->id, $changes];
    }

    private function nullableString(mixed $value): ?string
    {
        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }
}
