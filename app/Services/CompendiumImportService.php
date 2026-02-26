<?php

namespace App\Services;

use App\Models\Item;
use App\Models\Source;
use App\Models\Spell;
use Illuminate\Http\UploadedFile;

class CompendiumImportService
{
    /**
     * @return array<int, string>
     */
    public function supportedEntityTypes(): array
    {
        return ['items', 'spells'];
    }

    public function templateFor(string $entityType): string
    {
        if ($entityType === 'items') {
            return implode("\n", [
                'name,type,rarity,cost,url,source_shortcode,guild_enabled,shop_enabled,ruling_changed,ruling_note',
                'Potion of Healing,consumable,common,50 GP,https://example.test/items/potion-healing,PHB,true,true,false,',
            ])."\n";
        }

        return implode("\n", [
            'name,spell_level,spell_school,url,legacy_url,source_shortcode,guild_enabled,ruling_changed,ruling_note',
            'Fireball,3,evocation,https://example.test/spells/fireball,https://example.test/spells/legacy-fireball,PHB,true,false,',
        ])."\n";
    }

    /**
     * @return array{
     *     summary: array{total_rows:int,new_rows:int,updated_rows:int,unchanged_rows:int,invalid_rows:int},
     *     row_samples: array<int, array<string, mixed>>,
     *     error_samples: array<int, array<string, mixed>>,
     *     import_rows: array<int, array<string, mixed>>
     * }
     */
    public function preview(string $entityType, UploadedFile $file): array
    {
        $sourceMap = Source::query()
            ->get(['id', 'shortcode'])
            ->mapWithKeys(fn (Source $source) => [strtoupper($source->shortcode) => $source->id]);

        [$headers, $rows] = $this->readCsvRows($file);

        $requiredHeaders = $this->requiredHeadersFor($entityType);
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
                    'line' => 1,
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

        foreach ($rows as $rowData) {
            $summary['total_rows']++;
            $line = (int) $rowData['line'];
            /** @var array<string, string> $row */
            $row = $rowData['row'];

            [$payload, $errors] = $entityType === 'items'
                ? $this->normalizeItemRow($row, $sourceMap->toArray())
                : $this->normalizeSpellRow($row, $sourceMap->toArray());

            if ($payload === null) {
                $summary['invalid_rows']++;
                if (count($errorSamples) < 20) {
                    $errorSamples[] = [
                        'line' => $line,
                        'message' => implode(' | ', $errors),
                    ];
                }

                continue;
            }

            [$action, $existingId, $changes] = $entityType === 'items'
                ? $this->determineItemAction($payload)
                : $this->determineSpellAction($payload);

            $summary["{$action}_rows"]++;

            $importRows[] = [
                'line' => $line,
                'action' => $action,
                'payload' => $payload,
                'existing_id' => $existingId,
            ];

            $rowSamples[] = [
                'line' => $line,
                'action' => $action,
                'payload' => $payload,
                'source_shortcode' => strtoupper(trim((string) ($row['source_shortcode'] ?? $row['source'] ?? ''))),
                'existing_id' => $existingId,
                'changes' => $changes,
            ];
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
    public function apply(string $entityType, array $importRows): array
    {
        $summary = [
            'total_rows' => count($importRows),
            'new_rows' => 0,
            'updated_rows' => 0,
            'unchanged_rows' => 0,
            'invalid_rows' => 0,
        ];

        foreach ($importRows as $importRow) {
            $payload = is_array($importRow['payload'] ?? null) ? $importRow['payload'] : null;
            if (! is_array($payload)) {
                $summary['invalid_rows']++;

                continue;
            }

            if ($entityType === 'items') {
                [$action] = $this->determineItemAction($payload);
                if ($action === 'new') {
                    $item = new Item;
                    $item->forceFill($payload)->save();
                    $summary['new_rows']++;

                    continue;
                }

                $existing = Item::query()
                    ->where('name', $payload['name'])
                    ->where('type', $payload['type'])
                    ->where('source_id', $payload['source_id'])
                    ->first();
                if (! $existing) {
                    $existing = $this->findMatchingItem($payload);
                }

                if (! $existing) {
                    $item = new Item;
                    $item->forceFill($payload)->save();
                    $summary['new_rows']++;

                    continue;
                }

                if ($action === 'updated') {
                    $existing->forceFill($payload)->save();
                    $summary['updated_rows']++;

                    continue;
                }

                $summary['unchanged_rows']++;

                continue;
            }

            [$action] = $this->determineSpellAction($payload);
            if ($action === 'new') {
                $spell = new Spell;
                $spell->forceFill($payload)->save();
                $summary['new_rows']++;

                continue;
            }

            $existing = Spell::query()
                ->where('name', $payload['name'])
                ->where('spell_level', $payload['spell_level'])
                ->where('spell_school', $payload['spell_school'])
                ->where('source_id', $payload['source_id'])
                ->first();
            if (! $existing) {
                $existing = $this->findMatchingSpell($payload);
            }

            if (! $existing) {
                $spell = new Spell;
                $spell->forceFill($payload)->save();
                $summary['new_rows']++;

                continue;
            }

            if ($action === 'updated') {
                $existing->forceFill($payload)->save();
                $summary['updated_rows']++;

                continue;
            }

            $summary['unchanged_rows']++;
        }

        return $summary;
    }

    /**
     * @return array<int, string>
     */
    private function requiredHeadersFor(string $entityType): array
    {
        if ($entityType === 'items') {
            return ['name', 'type', 'rarity'];
        }

        return ['name', 'spell_level', 'spell_school'];
    }

    /**
     * @return array{0: array<int, string>, 1: array<int, array{line:int,row:array<string,string>}>}
     */
    private function readCsvRows(UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'rb');
        if ($handle === false) {
            return [[], []];
        }

        $headerRow = fgetcsv($handle);
        $headers = is_array($headerRow) ? array_values(array_map(fn ($value) => $this->normalizeHeader((string) $value), $headerRow)) : [];

        $rows = [];
        $line = 1;
        while (($row = fgetcsv($handle)) !== false) {
            $line++;
            if (! is_array($row)) {
                continue;
            }

            $normalizedValues = array_map(fn ($value) => trim((string) $value), $row);
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

        return [$headers, $rows];
    }

    private function normalizeHeader(string $header): string
    {
        $normalized = trim($header);
        $normalized = preg_replace('/^\xEF\xBB\xBF/u', '', $normalized) ?? $normalized;

        return strtolower($normalized);
    }

    /**
     * @param  array<string, string>  $row
     * @param  array<string, int>  $sourceMap
     * @return array{0: array<string, mixed>|null, 1: array<int, string>}
     */
    private function normalizeItemRow(array $row, array $sourceMap): array
    {
        $errors = [];
        $name = trim((string) ($row['name'] ?? ''));
        $type = strtolower(trim((string) ($row['type'] ?? '')));
        $rarity = strtolower(trim((string) ($row['rarity'] ?? '')));
        $cost = $this->nullableString($row['cost'] ?? null);
        $url = $this->nullableString($row['url'] ?? null);
        $sourceShortcode = strtoupper(trim((string) ($row['source_shortcode'] ?? $row['source'] ?? $row['source_code'] ?? '')));
        $sourceId = null;

        if ($name === '') {
            $errors[] = 'name is required';
        }
        if (! in_array($type, ['weapon', 'armor', 'item', 'consumable', 'spellscroll'], true)) {
            $errors[] = 'type must be weapon|armor|item|consumable|spellscroll';
        }
        if (! in_array($rarity, ['common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact', 'unknown_rarity'], true)) {
            $errors[] = 'rarity must be common|uncommon|rare|very_rare|legendary|artifact|unknown_rarity';
        }
        if ($url !== null && ! filter_var($url, FILTER_VALIDATE_URL)) {
            $errors[] = 'url must be a valid URL';
        }
        if ($sourceShortcode !== '') {
            $sourceId = $sourceMap[$sourceShortcode] ?? null;
            if ($sourceId === null) {
                $errors[] = "unknown source shortcode '{$sourceShortcode}'";
            }
        }

        $guildEnabled = $this->parseBoolean($row['guild_enabled'] ?? null, true, 'guild_enabled', $errors);
        $shopEnabled = $this->parseBoolean($row['shop_enabled'] ?? null, true, 'shop_enabled', $errors);
        $rulingChanged = $this->parseBoolean($row['ruling_changed'] ?? null, false, 'ruling_changed', $errors);
        $rulingNote = $this->nullableString($row['ruling_note'] ?? null);
        if (! $rulingChanged) {
            $rulingNote = null;
        }

        if ($errors !== []) {
            return [null, $errors];
        }

        return [[
            'name' => $name,
            'type' => $type,
            'rarity' => $rarity,
            'cost' => $cost,
            'url' => $url,
            'source_id' => $sourceId,
            'guild_enabled' => $guildEnabled,
            'shop_enabled' => $shopEnabled,
            'ruling_changed' => $rulingChanged,
            'ruling_note' => $rulingNote,
        ], []];
    }

    /**
     * @param  array<string, string>  $row
     * @param  array<string, int>  $sourceMap
     * @return array{0: array<string, mixed>|null, 1: array<int, string>}
     */
    private function normalizeSpellRow(array $row, array $sourceMap): array
    {
        $errors = [];
        $name = trim((string) ($row['name'] ?? ''));
        $spellLevelRaw = trim((string) ($row['spell_level'] ?? ''));
        $spellSchool = strtolower(trim((string) ($row['spell_school'] ?? '')));
        $url = $this->nullableString($row['url'] ?? null);
        $legacyUrl = $this->nullableString($row['legacy_url'] ?? null);
        $sourceShortcode = strtoupper(trim((string) ($row['source_shortcode'] ?? $row['source'] ?? $row['source_code'] ?? '')));
        $sourceId = null;

        if ($name === '') {
            $errors[] = 'name is required';
        }

        if ($spellLevelRaw === '' || ! ctype_digit($spellLevelRaw)) {
            $errors[] = 'spell_level must be an integer between 0 and 9';
            $spellLevel = null;
        } else {
            $spellLevel = (int) $spellLevelRaw;
            if ($spellLevel < 0 || $spellLevel > 9) {
                $errors[] = 'spell_level must be an integer between 0 and 9';
            }
        }

        if (! in_array($spellSchool, [
            'abjuration',
            'conjuration',
            'divination',
            'enchantment',
            'evocation',
            'illusion',
            'necromancy',
            'transmutation',
        ], true)) {
            $errors[] = 'spell_school must be a valid school';
        }

        if ($url !== null && ! filter_var($url, FILTER_VALIDATE_URL)) {
            $errors[] = 'url must be a valid URL';
        }
        if ($legacyUrl !== null && ! filter_var($legacyUrl, FILTER_VALIDATE_URL)) {
            $errors[] = 'legacy_url must be a valid URL';
        }
        if ($sourceShortcode !== '') {
            $sourceId = $sourceMap[$sourceShortcode] ?? null;
            if ($sourceId === null) {
                $errors[] = "unknown source shortcode '{$sourceShortcode}'";
            }
        }

        $guildEnabled = $this->parseBoolean($row['guild_enabled'] ?? null, true, 'guild_enabled', $errors);
        $rulingChanged = $this->parseBoolean($row['ruling_changed'] ?? null, false, 'ruling_changed', $errors);
        $rulingNote = $this->nullableString($row['ruling_note'] ?? null);
        if (! $rulingChanged) {
            $rulingNote = null;
        }

        if ($errors !== []) {
            return [null, $errors];
        }

        return [[
            'name' => $name,
            'spell_level' => $spellLevel,
            'spell_school' => $spellSchool,
            'url' => $url,
            'legacy_url' => $legacyUrl,
            'source_id' => $sourceId,
            'guild_enabled' => $guildEnabled,
            'ruling_changed' => $rulingChanged,
            'ruling_note' => $rulingNote,
        ], []];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{0:'new'|'updated'|'unchanged',1:int|null,2:array<string, array{from:mixed,to:mixed}>}
     */
    private function determineItemAction(array $payload): array
    {
        $existing = $this->findMatchingItem($payload);

        if (! $existing) {
            return ['new', null, []];
        }

        $comparableFields = [
            'rarity' => $payload['rarity'],
            'cost' => $payload['cost'],
            'url' => $payload['url'],
            'guild_enabled' => (bool) $payload['guild_enabled'],
            'shop_enabled' => (bool) $payload['shop_enabled'],
            'ruling_changed' => (bool) $payload['ruling_changed'],
            'ruling_note' => $payload['ruling_note'],
        ];

        $changes = [];
        foreach ($comparableFields as $field => $value) {
            if ($existing->{$field} !== $value) {
                $changes[$field] = [
                    'from' => $existing->{$field},
                    'to' => $value,
                ];
            }
        }

        if ($changes !== []) {
            return ['updated', $existing->id, $changes];
        }

        return ['unchanged', $existing->id, []];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{0:'new'|'updated'|'unchanged',1:int|null,2:array<string, array{from:mixed,to:mixed}>}
     */
    private function determineSpellAction(array $payload): array
    {
        $existing = $this->findMatchingSpell($payload);

        if (! $existing) {
            return ['new', null, []];
        }

        $comparableFields = [
            'url' => $payload['url'],
            'legacy_url' => $payload['legacy_url'],
            'guild_enabled' => (bool) $payload['guild_enabled'],
            'ruling_changed' => (bool) $payload['ruling_changed'],
            'ruling_note' => $payload['ruling_note'],
        ];

        $changes = [];
        foreach ($comparableFields as $field => $value) {
            if ($existing->{$field} !== $value) {
                $changes[$field] = [
                    'from' => $existing->{$field},
                    'to' => $value,
                ];
            }
        }

        if ($changes !== []) {
            return ['updated', $existing->id, $changes];
        }

        return ['unchanged', $existing->id, []];
    }

    private function nullableString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }
        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }

    /**
     * @param  array<int, string>  $errors
     */
    private function parseBoolean(mixed $value, bool $default, string $field, array &$errors): bool
    {
        if (! is_string($value) || trim($value) === '') {
            return $default;
        }

        $normalized = strtolower(trim($value));
        if (in_array($normalized, ['1', 'true', 'yes', 'y', 'ja', 'j'], true)) {
            return true;
        }
        if (in_array($normalized, ['0', 'false', 'no', 'n', 'nein'], true)) {
            return false;
        }

        $errors[] = "{$field} must be true/false";

        return $default;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function findMatchingItem(array $payload): ?Item
    {
        $exact = Item::query()
            ->where('name', $payload['name'])
            ->where('type', $payload['type'])
            ->where('source_id', $payload['source_id'])
            ->first();

        if ($exact) {
            return $exact;
        }

        if ($payload['source_id'] === null) {
            return null;
        }

        $fallbackMatches = Item::query()
            ->where('name', $payload['name'])
            ->where('type', $payload['type'])
            ->whereNull('source_id')
            ->get();

        if ($fallbackMatches->count() === 1) {
            return $fallbackMatches->first();
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function findMatchingSpell(array $payload): ?Spell
    {
        $exact = Spell::query()
            ->where('name', $payload['name'])
            ->where('spell_level', $payload['spell_level'])
            ->where('spell_school', $payload['spell_school'])
            ->where('source_id', $payload['source_id'])
            ->first();

        if ($exact) {
            return $exact;
        }

        if ($payload['source_id'] === null) {
            return null;
        }

        $fallbackMatches = Spell::query()
            ->where('name', $payload['name'])
            ->where('spell_level', $payload['spell_level'])
            ->where('spell_school', $payload['spell_school'])
            ->whereNull('source_id')
            ->get();

        if ($fallbackMatches->count() === 1) {
            return $fallbackMatches->first();
        }

        return null;
    }
}
