<?php

namespace App\Services;

use App\Models\Item;
use App\Models\MundaneItemVariant;
use App\Models\Source;
use App\Models\Spell;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;

class CompendiumImportService
{
    /**
     * @return array<int, string>
     */
    public function supportedEntityTypes(): array
    {
        return ['items', 'spells', 'sources'];
    }

    public function templateFor(string $entityType): string
    {
        if ($entityType === 'items') {
            return implode("\n", [
                implode(',', $this->columnsFor('items')),
                'Potion of Healing,consumable,common,50 GP,Component cost,https://example.test/items/potion-healing,PHB,,false,,,true,true,false,',
            ])."\n";
        }

        if ($entityType === 'sources') {
            return implode("\n", [
                implode(',', $this->columnsFor('sources')),
                "PHB,Player's Handbook,official",
            ])."\n";
        }

        return implode("\n", [
            implode(',', $this->columnsFor('spells')),
            'Fireball,3,evocation,https://example.test/spells/fireball,https://example.test/spells/legacy-fireball,PHB,true,false,',
        ])."\n";
    }

    /**
     * @return array<int, string>
     */
    public function columnsFor(string $entityType): array
    {
        if ($entityType === 'items') {
            return ['name', 'type', 'rarity', 'cost', 'extra_cost_note', 'url', 'source_shortcode', 'mundane_variant_slugs', 'default_spell_roll_enabled', 'default_spell_levels', 'default_spell_schools', 'guild_enabled', 'shop_enabled', 'ruling_changed', 'ruling_note'];
        }

        if ($entityType === 'sources') {
            return ['shortcode', 'name', 'kind'];
        }

        return ['name', 'spell_level', 'spell_school', 'url', 'legacy_url', 'source_shortcode', 'guild_enabled', 'ruling_changed', 'ruling_note'];
    }

    /**
     * @return array<int, array<int, string>>
     */
    public function exportRowsFor(string $entityType): array
    {
        if ($entityType === 'items') {
            /** @var Collection<int, Item> $items */
            $items = Item::query()
                ->with([
                    'source:id,shortcode',
                    'mundaneVariants:id,slug',
                ])
                ->orderBy('name')
                ->orderBy('type')
                ->orderBy('id')
                ->get();

            return $items->map(function (Item $item): array {
                return [
                    (string) $item->name,
                    (string) $item->type,
                    (string) $item->rarity,
                    (string) ($item->cost ?? ''),
                    (string) ($item->extra_cost_note ?? ''),
                    (string) ($item->url ?? ''),
                    (string) ($item->source?->shortcode ?? ''),
                    implode(',', $item->mundaneVariants->pluck('slug')->filter()->sort()->values()->all()),
                    $this->formatBooleanForCsv((bool) $item->default_spell_roll_enabled),
                    implode(',', collect((array) ($item->default_spell_levels ?? []))
                        ->map(static fn ($level): string => (string) $level)
                        ->filter()
                        ->values()
                        ->all()),
                    implode(',', collect((array) ($item->default_spell_schools ?? []))
                        ->map(static fn ($school): string => (string) $school)
                        ->filter()
                        ->values()
                        ->all()),
                    $this->formatBooleanForCsv((bool) $item->guild_enabled),
                    $this->formatBooleanForCsv((bool) $item->shop_enabled),
                    $this->formatBooleanForCsv((bool) $item->ruling_changed),
                    (string) ($item->ruling_note ?? ''),
                ];
            })->all();
        }

        if ($entityType === 'sources') {
            /** @var Collection<int, Source> $sources */
            $sources = Source::query()
                ->orderBy('shortcode')
                ->orderBy('name')
                ->orderBy('id')
                ->get();

            return $sources->map(function (Source $source): array {
                return [
                    (string) $source->shortcode,
                    (string) $source->name,
                    (string) $source->kind,
                ];
            })->all();
        }

        /** @var Collection<int, Spell> $spells */
        $spells = Spell::query()
            ->with('source:id,shortcode')
            ->orderBy('name')
            ->orderBy('spell_level')
            ->orderBy('id')
            ->get();

        return $spells->map(function (Spell $spell): array {
            return [
                (string) $spell->name,
                (string) $spell->spell_level,
                (string) $spell->spell_school,
                (string) ($spell->url ?? ''),
                (string) ($spell->legacy_url ?? ''),
                (string) ($spell->source?->shortcode ?? ''),
                $this->formatBooleanForCsv((bool) $spell->guild_enabled),
                $this->formatBooleanForCsv((bool) $spell->ruling_changed),
                (string) ($spell->ruling_note ?? ''),
            ];
        })->all();
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

            if ($entityType === 'items') {
                [$payload, $errors] = $this->normalizeItemRow($row, $sourceMap->toArray());
            } elseif ($entityType === 'spells') {
                [$payload, $errors] = $this->normalizeSpellRow($row, $sourceMap->toArray());
            } else {
                [$payload, $errors] = $this->normalizeSourceRow($row);
            }

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

            if ($entityType === 'items') {
                [$action, $existingId, $changes] = $this->determineItemAction($payload);
            } elseif ($entityType === 'spells') {
                [$action, $existingId, $changes] = $this->determineSpellAction($payload);
            } else {
                [$action, $existingId, $changes] = $this->determineSourceAction($payload);
            }

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
                'source_shortcode' => $entityType === 'sources'
                    ? strtoupper(trim((string) ($row['shortcode'] ?? '')))
                    : strtoupper(trim((string) ($row['source_shortcode'] ?? $row['source'] ?? ''))),
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
            $action = is_string($importRow['action'] ?? null) ? $importRow['action'] : null;
            $existingId = is_numeric($importRow['existing_id'] ?? null) ? (int) $importRow['existing_id'] : null;
            if (! is_array($payload)) {
                $summary['invalid_rows']++;

                continue;
            }

            if ($action === 'unchanged') {
                $summary['unchanged_rows']++;

                continue;
            }

            if ($entityType === 'items') {
                if ($action === 'new') {
                    $item = new Item;
                    $itemPayload = $payload;
                    $mundaneVariantIds = $this->extractMundaneVariantIds($itemPayload);

                    $item->forceFill($itemPayload)->save();
                    $item->mundaneVariants()->sync($mundaneVariantIds);
                    $summary['new_rows']++;

                    continue;
                }

                $existing = $existingId !== null ? Item::query()->find($existingId) : null;
                if (! $existing) {
                    $existing = $this->findMatchingItem($payload);
                }

                if (! $existing) {
                    $item = new Item;
                    $itemPayload = $payload;
                    $mundaneVariantIds = $this->extractMundaneVariantIds($itemPayload);

                    $item->forceFill($itemPayload)->save();
                    $item->mundaneVariants()->sync($mundaneVariantIds);
                    $summary['new_rows']++;

                    continue;
                }

                if ($action === 'updated') {
                    $itemPayload = $payload;
                    $mundaneVariantIds = $this->extractMundaneVariantIds($itemPayload);

                    $existing->forceFill($itemPayload)->save();
                    $existing->mundaneVariants()->sync($mundaneVariantIds);
                    $summary['updated_rows']++;

                    continue;
                }

                continue;
            }

            if ($entityType === 'spells') {
                if ($action === 'new') {
                    $spell = new Spell;
                    $spell->forceFill($payload)->save();
                    $summary['new_rows']++;

                    continue;
                }

                $existing = $existingId !== null ? Spell::query()->find($existingId) : null;
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

                continue;
            }

            if ($action === 'new') {
                $source = new Source;
                $source->forceFill($payload)->save();
                $summary['new_rows']++;

                continue;
            }

            $existing = $existingId !== null ? Source::query()->find($existingId) : null;
            if (! $existing) {
                $existing = Source::query()
                    ->where('shortcode', $payload['shortcode'])
                    ->first();
            }

            if (! $existing) {
                $source = new Source;
                $source->forceFill($payload)->save();
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

        if ($entityType === 'sources') {
            return ['shortcode', 'name', 'kind'];
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
        $extraCostNote = $this->nullableString($row['extra_cost_note'] ?? $row['extra_cost'] ?? null);
        $url = $this->nullableString($row['url'] ?? null);
        $sourceShortcode = strtoupper(trim((string) ($row['source_shortcode'] ?? $row['source'] ?? $row['source_code'] ?? '')));
        $mundaneVariantSlugs = trim((string) ($row['mundane_variant_slugs'] ?? ''));
        $sourceId = null;
        $mundaneVariantIds = [];

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

        if ($mundaneVariantSlugs !== '') {
            $variantSlugs = collect(explode(',', $mundaneVariantSlugs))
                ->map(static fn (string $slug): string => trim($slug))
                ->filter(static fn (string $slug): bool => $slug !== '')
                ->unique()
                ->values();

            $variants = MundaneItemVariant::query()
                ->whereIn('slug', $variantSlugs->all())
                ->get(['id', 'slug', 'category', 'is_placeholder']);

            $foundSlugs = $variants->pluck('slug')->all();
            $missingSlugs = $variantSlugs
                ->reject(static fn (string $slug): bool => in_array($slug, $foundSlugs, true))
                ->values();

            if ($missingSlugs->isNotEmpty()) {
                $errors[] = 'unknown mundane_variant_slugs: '.$missingSlugs->implode(', ');
            }

            if (in_array($type, ['weapon', 'armor'], true)) {
                $invalidCount = $variants
                    ->where('category', '!=', $type)
                    ->count();

                if ($invalidCount > 0) {
                    $errors[] = "Only {$type} variants can be attached to {$type} items.";
                }

                $hasAnyOption = $variants->contains(static fn ($variant): bool => (bool) $variant->is_placeholder);
                if ($hasAnyOption && $variantSlugs->count() > 1) {
                    $label = ucfirst($type);
                    $errors[] = "The Any {$label} option cannot be combined with specific {$type} variants.";
                }
            } elseif ($variantSlugs->isNotEmpty()) {
                $errors[] = 'Mundane variants are only allowed for weapon or armor items.';
            }

            $mundaneVariantIds = $variants
                ->pluck('id')
                ->map(static fn ($id): int => (int) $id)
                ->values()
                ->all();
        }

        if (in_array($type, ['weapon', 'armor'], true)) {
            $extraCostNote = null;
        } elseif ($extraCostNote !== null) {
            $extraCostNote = preg_replace('/^\+\s*/u', '', $extraCostNote) ?? $extraCostNote;
            $extraCostNote = trim($extraCostNote);
            if ($extraCostNote === '') {
                $extraCostNote = null;
            }
        }

        $defaultSpellRollEnabled = $this->parseBoolean($row['default_spell_roll_enabled'] ?? null, false, 'default_spell_roll_enabled', $errors);
        $defaultSpellLevelsRaw = $this->parseStringCsvList($row['default_spell_levels'] ?? null, false);
        $invalidDefaultSpellLevelEntries = collect($defaultSpellLevelsRaw)
            ->reject(static fn (string $level): bool => ctype_digit($level))
            ->values();
        if ($invalidDefaultSpellLevelEntries->isNotEmpty()) {
            $errors[] = 'default_spell_levels must contain integers between 0 and 9';
        }
        $defaultSpellLevels = collect($defaultSpellLevelsRaw)
            ->filter(static fn (string $level): bool => ctype_digit($level))
            ->map(static fn (string $level): int => (int) $level)
            ->values()
            ->all();
        $defaultSpellSchools = $this->parseStringCsvList($row['default_spell_schools'] ?? null);

        $invalidSpellLevels = collect($defaultSpellLevels)
            ->filter(static fn (int $level): bool => $level < 0 || $level > 9)
            ->values();
        if ($invalidSpellLevels->isNotEmpty()) {
            $errors[] = 'default_spell_levels must contain integers between 0 and 9';
        }

        $allowedSpellSchools = [
            'abjuration',
            'conjuration',
            'divination',
            'enchantment',
            'evocation',
            'illusion',
            'necromancy',
            'transmutation',
        ];
        $invalidSpellSchools = collect($defaultSpellSchools)
            ->reject(static fn (string $school): bool => in_array($school, $allowedSpellSchools, true))
            ->values();
        if ($invalidSpellSchools->isNotEmpty()) {
            $errors[] = 'default_spell_schools must contain valid spell schools';
        }

        if ($defaultSpellRollEnabled && $defaultSpellLevels === []) {
            $errors[] = 'default_spell_levels are required when default_spell_roll_enabled is true';
        }
        if (! $defaultSpellRollEnabled) {
            $defaultSpellLevels = [];
            $defaultSpellSchools = [];
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
            'extra_cost_note' => $extraCostNote,
            'url' => $url,
            'source_id' => $sourceId,
            'mundane_variant_ids' => $mundaneVariantIds,
            'default_spell_roll_enabled' => $defaultSpellRollEnabled,
            'default_spell_levels' => $defaultSpellRollEnabled ? $defaultSpellLevels : null,
            'default_spell_schools' => $defaultSpellRollEnabled ? ($defaultSpellSchools === [] ? null : $defaultSpellSchools) : null,
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
     * @param  array<string, string>  $row
     * @return array{0: array<string, mixed>|null, 1: array<int, string>}
     */
    private function normalizeSourceRow(array $row): array
    {
        $errors = [];
        $shortcode = strtoupper(trim((string) ($row['shortcode'] ?? '')));
        $name = trim((string) ($row['name'] ?? ''));
        $kind = strtolower(trim((string) ($row['kind'] ?? '')));

        if ($shortcode === '') {
            $errors[] = 'shortcode is required';
        } elseif (mb_strlen($shortcode) > 32) {
            $errors[] = 'shortcode must be 32 characters or less';
        } elseif (! preg_match('/^[A-Z0-9_-]+$/', $shortcode)) {
            $errors[] = 'shortcode must contain only A-Z, 0-9, underscore, or hyphen';
        }

        if ($name === '') {
            $errors[] = 'name is required';
        }

        if (! in_array($kind, ['official', 'third_party'], true)) {
            $errors[] = 'kind must be official|third_party';
        }

        if ($errors !== []) {
            return [null, $errors];
        }

        return [[
            'shortcode' => $shortcode,
            'name' => $name,
            'kind' => $kind,
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
            'extra_cost_note' => $payload['extra_cost_note'],
            'url' => $payload['url'],
            'source_id' => $payload['source_id'],
            'guild_enabled' => (bool) $payload['guild_enabled'],
            'shop_enabled' => (bool) $payload['shop_enabled'],
            'default_spell_roll_enabled' => (bool) $payload['default_spell_roll_enabled'],
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

        $existingVariantIds = $existing->mundaneVariants()
            ->pluck('mundane_item_variants.id')
            ->map(static fn ($id): int => (int) $id)
            ->sort()
            ->values()
            ->all();
        $payloadVariantIds = collect((array) ($payload['mundane_variant_ids'] ?? []))
            ->map(static fn ($id): int => (int) $id)
            ->sort()
            ->values()
            ->all();

        if ($existingVariantIds !== $payloadVariantIds) {
            $changes['mundane_variant_ids'] = [
                'from' => $existingVariantIds,
                'to' => $payloadVariantIds,
            ];
        }

        $existingDefaultSpellLevels = collect((array) ($existing->default_spell_levels ?? []))
            ->map(static fn ($level): int => (int) $level)
            ->sort()
            ->values()
            ->all();
        $payloadDefaultSpellLevels = collect((array) ($payload['default_spell_levels'] ?? []))
            ->map(static fn ($level): int => (int) $level)
            ->sort()
            ->values()
            ->all();

        if ($existingDefaultSpellLevels !== $payloadDefaultSpellLevels) {
            $changes['default_spell_levels'] = [
                'from' => $existingDefaultSpellLevels,
                'to' => $payloadDefaultSpellLevels,
            ];
        }

        $existingDefaultSpellSchools = collect((array) ($existing->default_spell_schools ?? []))
            ->map(static fn ($school): string => (string) $school)
            ->sort()
            ->values()
            ->all();
        $payloadDefaultSpellSchools = collect((array) ($payload['default_spell_schools'] ?? []))
            ->map(static fn ($school): string => (string) $school)
            ->sort()
            ->values()
            ->all();

        if ($existingDefaultSpellSchools !== $payloadDefaultSpellSchools) {
            $changes['default_spell_schools'] = [
                'from' => $existingDefaultSpellSchools,
                'to' => $payloadDefaultSpellSchools,
            ];
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
            'source_id' => $payload['source_id'],
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

    /**
     * @param  array<string, mixed>  $payload
     * @return array{0:'new'|'updated'|'unchanged',1:int|null,2:array<string, array{from:mixed,to:mixed}>}
     */
    private function determineSourceAction(array $payload): array
    {
        $existing = Source::query()
            ->where('shortcode', $payload['shortcode'])
            ->first();

        if (! $existing) {
            return ['new', null, []];
        }

        $comparableFields = [
            'name' => $payload['name'],
            'kind' => $payload['kind'],
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

    private function formatBooleanForCsv(bool $value): string
    {
        return $value ? 'true' : 'false';
    }

    /**
     * @return array<int, int>
     */
    private function parseStringCsvList(mixed $value, bool $lowercase = true): array
    {
        if (! is_string($value) || trim($value) === '') {
            return [];
        }

        return collect(explode(',', $value))
            ->map(static fn (string $entry): string => trim($entry))
            ->map(static fn (string $entry): string => $lowercase ? strtolower($entry) : $entry)
            ->filter(static fn (string $entry): bool => $entry !== '')
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<int, int>
     */
    private function extractMundaneVariantIds(array &$payload): array
    {
        $variantIds = collect((array) ($payload['mundane_variant_ids'] ?? []))
            ->map(static fn ($id): ?int => is_numeric($id) ? (int) $id : null)
            ->filter(static fn (?int $id): bool => $id !== null && $id > 0)
            ->unique()
            ->values()
            ->all();

        unset($payload['mundane_variant_ids']);

        return $variantIds;
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
        $url = is_string($payload['url'] ?? null) ? trim((string) $payload['url']) : '';
        if ($url !== '') {
            $urlMatches = Item::query()
                ->where('url', $url)
                ->get();

            if ($urlMatches->count() === 1) {
                return $urlMatches->first();
            }
        }

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
