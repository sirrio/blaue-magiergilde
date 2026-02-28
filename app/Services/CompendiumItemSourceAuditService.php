<?php

namespace App\Services;

use App\Models\Item;
use App\Models\Source;
use Illuminate\Support\Collection;
use InvalidArgumentException;

class CompendiumItemSourceAuditService
{
    /**
     * @return array{
     *     summary: array<string, int>,
     *     samples: array<string, mixed>
     * }
     */
    public function audit(int $sampleLimit = 20): array
    {
        $sampleLimit = max(1, $sampleLimit);

        $totalItems = Item::query()->count();
        $itemsWithoutSource = Item::query()->whereNull('source_id')->count();
        $itemsWithSource = $totalItems - $itemsWithoutSource;

        $duplicateUrlGroups = Item::query()
            ->whereNotNull('url')
            ->where('url', '!=', '')
            ->groupBy('url')
            ->havingRaw('COUNT(*) > 1')
            ->get(['url'])
            ->count();

        $conflictingSourcedUrlGroups = Item::query()
            ->whereNotNull('url')
            ->where('url', '!=', '')
            ->whereNotNull('source_id')
            ->groupBy('url')
            ->havingRaw('COUNT(DISTINCT source_id) > 1')
            ->get(['url'])
            ->count();

        $missingSourceByType = Item::query()
            ->selectRaw('type, COUNT(*) AS aggregate')
            ->whereNull('source_id')
            ->groupBy('type')
            ->orderByDesc('aggregate')
            ->pluck('aggregate', 'type')
            ->map(static fn (mixed $count): int => (int) $count)
            ->all();

        $sourceUsage = Source::query()
            ->withCount('items')
            ->orderByDesc('items_count')
            ->orderBy('shortcode')
            ->limit($sampleLimit)
            ->get(['id', 'name', 'shortcode'])
            ->map(static fn (Source $source): array => [
                'id' => $source->id,
                'name' => $source->name,
                'shortcode' => $source->shortcode,
                'items_count' => (int) $source->items_count,
            ])
            ->values()
            ->all();

        return [
            'summary' => [
                'total_items' => $totalItems,
                'items_with_source' => $itemsWithSource,
                'items_without_source' => $itemsWithoutSource,
                'duplicate_url_groups' => $duplicateUrlGroups,
                'conflicting_sourced_url_groups' => $conflictingSourcedUrlGroups,
            ],
            'samples' => [
                'missing_source_items' => Item::query()
                    ->whereNull('source_id')
                    ->orderBy('id')
                    ->limit($sampleLimit)
                    ->get(['id', 'name', 'type', 'rarity', 'url'])
                    ->map(static fn (Item $item): array => [
                        'id' => $item->id,
                        'name' => $item->name,
                        'type' => $item->type,
                        'rarity' => $item->rarity,
                        'url' => $item->url,
                    ])
                    ->values()
                    ->all(),
                'duplicate_urls' => $this->duplicateUrlSamples($sampleLimit),
                'conflicting_sourced_urls' => $this->conflictingUrlSamples($sampleLimit),
                'missing_source_by_type' => $missingSourceByType,
                'source_usage' => $sourceUsage,
            ],
        ];
    }

    /**
     * @return array{
     *     summary: array<string, int|bool>,
     *     samples: array<string, mixed>
     * }
     */
    public function applyMapping(string $mappingPath, bool $apply = false, int $sampleLimit = 20): array
    {
        $sampleLimit = max(1, $sampleLimit);
        $rows = $this->readMappingRows($mappingPath);
        $sourceMap = Source::query()
            ->get(['id', 'shortcode'])
            ->mapWithKeys(static fn (Source $source): array => [mb_strtoupper($source->shortcode) => $source->id]);

        $summary = [
            'mapping_rows' => 0,
            'matched_items' => 0,
            'would_update_items' => 0,
            'updated_items' => 0,
            'unchanged_items' => 0,
            'conflict_items' => 0,
            'unknown_sources' => 0,
            'unmatched_rows' => 0,
            'invalid_rows' => 0,
            'applied' => $apply,
        ];

        $samples = [
            'updated' => [],
            'conflicts' => [],
            'unknown_sources' => [],
            'unmatched_rows' => [],
            'invalid_rows' => [],
        ];

        foreach ($rows as $rowNumber => $row) {
            $summary['mapping_rows']++;

            $sourceShortcode = mb_strtoupper(trim((string) ($row['source_shortcode'] ?? '')));
            if ($sourceShortcode === '') {
                $summary['invalid_rows']++;
                $this->pushSample($samples['invalid_rows'], $sampleLimit, [
                    'row' => $rowNumber,
                    'message' => 'Missing source_shortcode.',
                    'row_data' => $row,
                ]);

                continue;
            }

            $targetSourceId = $sourceMap->get($sourceShortcode);
            if ($targetSourceId === null) {
                $summary['unknown_sources']++;
                $this->pushSample($samples['unknown_sources'], $sampleLimit, [
                    'row' => $rowNumber,
                    'source_shortcode' => $sourceShortcode,
                    'row_data' => $row,
                ]);

                continue;
            }

            $matches = $this->resolveMappingMatches($row);
            if ($matches->isEmpty()) {
                $summary['unmatched_rows']++;
                $this->pushSample($samples['unmatched_rows'], $sampleLimit, [
                    'row' => $rowNumber,
                    'selector' => $this->describeSelector($row),
                ]);

                continue;
            }

            foreach ($matches as $item) {
                $summary['matched_items']++;

                if ((int) $item->source_id === (int) $targetSourceId) {
                    $summary['unchanged_items']++;

                    continue;
                }

                if ($item->source_id !== null) {
                    $summary['conflict_items']++;
                    $this->pushSample($samples['conflicts'], $sampleLimit, [
                        'row' => $rowNumber,
                        'item_id' => $item->id,
                        'name' => $item->name,
                        'selector' => $this->describeSelector($row),
                        'current_source_id' => (int) $item->source_id,
                        'target_source_id' => (int) $targetSourceId,
                    ]);

                    continue;
                }

                if ($apply) {
                    $item->forceFill(['source_id' => $targetSourceId])->save();
                    $summary['updated_items']++;
                } else {
                    $summary['would_update_items']++;
                }

                $this->pushSample($samples['updated'], $sampleLimit, [
                    'row' => $rowNumber,
                    'item_id' => $item->id,
                    'name' => $item->name,
                    'selector' => $this->describeSelector($row),
                    'target_source_id' => (int) $targetSourceId,
                ]);
            }
        }

        return [
            'summary' => $summary,
            'samples' => $samples,
        ];
    }

    /**
     * @return list<array<string, string>>
     */
    private function readMappingRows(string $mappingPath): array
    {
        if (! is_file($mappingPath)) {
            throw new InvalidArgumentException("Mapping file not found: {$mappingPath}");
        }

        $handle = fopen($mappingPath, 'rb');
        if ($handle === false) {
            throw new InvalidArgumentException("Mapping file could not be opened: {$mappingPath}");
        }

        $headers = fgetcsv($handle);
        if ($headers === false) {
            fclose($handle);

            return [];
        }

        $normalizedHeaders = array_map(
            static fn (mixed $header): string => trim((string) $header),
            $headers,
        );

        $rows = [];
        $line = 1;

        while (($values = fgetcsv($handle)) !== false) {
            $line++;
            $row = [];
            foreach ($normalizedHeaders as $index => $header) {
                if ($header === '') {
                    continue;
                }

                $row[$header] = trim((string) ($values[$index] ?? ''));
            }

            if ($row === [] || collect($row)->every(static fn (string $value): bool => $value === '')) {
                continue;
            }

            $rows[$line] = $row;
        }

        fclose($handle);

        return $rows;
    }

    /**
     * @param  array<string, string>  $row
     * @return Collection<int, Item>
     */
    private function resolveMappingMatches(array $row): Collection
    {
        $url = trim((string) ($row['url'] ?? ''));
        if ($url !== '') {
            return Item::query()
                ->where('url', $url)
                ->orderBy('id')
                ->get(['id', 'name', 'source_id', 'url', 'type']);
        }

        $name = trim((string) ($row['name'] ?? ''));
        $type = trim((string) ($row['type'] ?? ''));
        if ($name === '' || $type === '') {
            return collect();
        }

        return Item::query()
            ->where('name', $name)
            ->where('type', $type)
            ->orderBy('id')
            ->get(['id', 'name', 'source_id', 'url', 'type']);
    }

    /**
     * @param  array<string, mixed>  $sample
     * @param  list<array<string, mixed>>  $samples
     */
    private function pushSample(array &$samples, int $sampleLimit, array $sample): void
    {
        if (count($samples) >= $sampleLimit) {
            return;
        }

        $samples[] = $sample;
    }

    /**
     * @param  array<string, string>  $row
     */
    private function describeSelector(array $row): string
    {
        $url = trim((string) ($row['url'] ?? ''));
        if ($url !== '') {
            return "url={$url}";
        }

        $name = trim((string) ($row['name'] ?? ''));
        $type = trim((string) ($row['type'] ?? ''));

        return "name={$name}, type={$type}";
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function duplicateUrlSamples(int $sampleLimit): array
    {
        return Item::query()
            ->selectRaw('url, COUNT(*) AS aggregate, COUNT(DISTINCT source_id) AS distinct_sources')
            ->whereNotNull('url')
            ->where('url', '!=', '')
            ->groupBy('url')
            ->havingRaw('COUNT(*) > 1')
            ->orderByDesc('aggregate')
            ->orderBy('url')
            ->limit($sampleLimit)
            ->get()
            ->map(static fn (object $row): array => [
                'url' => (string) $row->url,
                'count' => (int) $row->aggregate,
                'distinct_sources' => (int) $row->distinct_sources,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function conflictingUrlSamples(int $sampleLimit): array
    {
        return Item::query()
            ->selectRaw('url, COUNT(*) AS aggregate, COUNT(DISTINCT source_id) AS distinct_sources')
            ->whereNotNull('url')
            ->where('url', '!=', '')
            ->whereNotNull('source_id')
            ->groupBy('url')
            ->havingRaw('COUNT(DISTINCT source_id) > 1')
            ->orderByDesc('distinct_sources')
            ->orderBy('url')
            ->limit($sampleLimit)
            ->get()
            ->map(static fn (object $row): array => [
                'url' => (string) $row->url,
                'count' => (int) $row->aggregate,
                'distinct_sources' => (int) $row->distinct_sources,
            ])
            ->values()
            ->all();
    }
}
