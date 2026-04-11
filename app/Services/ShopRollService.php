<?php

namespace App\Services;

use App\Models\Item;
use App\Models\Shop;
use App\Models\ShopItem;
use App\Models\ShopRollRule;
use App\Models\Spell;
use App\Support\ItemCostResolver;
use Illuminate\Support\Facades\DB;

class ShopRollService
{
    private function calculateWeight(float $alpha, int $input, int $minPickCount): float
    {
        return exp(-$alpha * ($input - $minPickCount));
    }

    private function weightedRandomSelection(array $items, int $count): array
    {
        if (empty($items)) {
            return [];
        }

        $minPickCount = min(array_column($items, 'pick_count'));
        $weights = array_map(fn ($item) => $this->calculateWeight(0.9, $item['pick_count'], $minPickCount), $items);
        $totalWeight = array_sum($weights);

        $picked = [];
        for ($i = 0; $i < $count && count($items) > 0; $i++) {
            $rand = mt_rand(0, $totalWeight * 1000) / 1000;
            $cumulativeWeight = 0;

            foreach ($items as $index => $item) {
                $cumulativeWeight += $weights[$index];
                if ($rand <= $cumulativeWeight) {
                    $picked[] = $item;
                    $totalWeight -= $weights[$index];
                    unset($items[$index]);
                    unset($weights[$index]);
                    break;
                }
            }
        }

        return $picked;
    }

    /**
     * @return array{0:int|null,1:Spell|null}
     */
    private function resolveSpellSnapshot(array $pickedItem): array
    {
        $spellId = null;
        $spellSnapshot = null;
        $autoRollEnabled = ! empty($pickedItem['default_spell_roll_enabled']);
        $spellLevels = $pickedItem['default_spell_levels'] ?? [];
        $spellSchools = $pickedItem['default_spell_schools'] ?? [];

        if (! $autoRollEnabled || ! is_array($spellLevels) || count($spellLevels) === 0) {
            return [$spellId, $spellSnapshot];
        }

        $normalizedLevels = array_values(array_unique(array_filter(array_map(
            static fn ($value) => is_numeric($value) ? (int) $value : null,
            $spellLevels
        ), static fn ($value) => $value !== null && $value >= 0 && $value <= 9)));
        $normalizedSchools = is_array($spellSchools)
            ? array_values(array_unique(array_filter(array_map(
                static fn ($value) => $value !== null ? (string) $value : null,
                $spellSchools
            ), static fn ($value) => $value !== null && $value !== '')))
            : [];

        if ($normalizedLevels === []) {
            return [$spellId, $spellSnapshot];
        }

        $query = Spell::query()
            ->select(['id', 'name', 'url', 'legacy_url', 'spell_level', 'spell_school', 'ruling_changed', 'ruling_note'])
            ->whereIn('spell_level', $normalizedLevels);
        if ($normalizedSchools !== []) {
            $query->whereIn('spell_school', $normalizedSchools);
        }

        $spellSnapshot = $query->inRandomOrder()->first();
        $spellId = $spellSnapshot?->id;

        return [$spellId, $spellSnapshot];
    }

    /**
     * @param  array<int, string>  $selectionTypes
     */
    private function pickLineReplacement(string $rarity, array $selectionTypes, string $sourceKind = 'all', ?int $excludeItemId = null): ?array
    {
        $normalizedSelectionTypes = array_values(array_unique(array_filter($selectionTypes, static fn (string $type): bool => $type !== '')));
        if ($normalizedSelectionTypes === []) {
            return null;
        }

        $query = Item::query()
            ->select([
                'id',
                'name',
                'url',
                'cost',
                'rarity',
                'type',
                'pick_count',
                'ruling_changed',
                'ruling_note',
                'default_spell_roll_enabled',
                'default_spell_levels',
                'default_spell_schools',
            ])
            ->with('mundaneVariants:id,name,slug,category,cost_gp,is_placeholder,sort_order')
            ->where('shop_enabled', true)
            ->where('rarity', $rarity);

        if ($sourceKind === 'official' || $sourceKind === 'third_party') {
            $query->whereHas('source', fn ($sourceQuery) => $sourceQuery->where('kind', $sourceKind));
        }

        $query->whereIn('type', $normalizedSelectionTypes);

        $candidates = $query->get();
        if ($candidates->isEmpty()) {
            return null;
        }

        $candidatePool = $candidates->map(static function (Item $item): array {
            $payload = $item->toArray();
            $payload['display_cost'] = ItemCostResolver::resolveForItem($item);

            return $payload;
        })->all();
        if ($excludeItemId !== null) {
            $withoutCurrent = array_values(array_filter(
                $candidatePool,
                static fn (array $entry) => (int) ($entry['id'] ?? 0) !== $excludeItemId,
            ));

            if ($withoutCurrent !== []) {
                $candidatePool = $withoutCurrent;
            }
        }

        $picked = $this->weightedRandomSelection($candidatePool, 1);

        return $picked[0] ?? null;
    }

    public function rerollLine(ShopItem $shopItem): ?ShopItem
    {
        return DB::transaction(function () use ($shopItem): ?ShopItem {
            $line = ShopItem::query()
                ->lockForUpdate()
                ->find($shopItem->id);

            if (! $line) {
                return null;
            }

            $rarity = (string) ($line->item_rarity ?: ($line->item?->rarity ?: 'common'));
            $type = (string) ($line->item_type ?: ($line->item?->type ?: 'item'));
            $oldItemId = $line->item_id ? (int) $line->item_id : null;
            $sourceKind = (string) ($line->roll_source_kind ?: 'all');
            $replacement = $this->pickLineReplacement($rarity, [$type], $sourceKind, $oldItemId);

            if (! $replacement) {
                return null;
            }

            $newItemId = (int) $replacement['id'];
            [$spellId, $spellSnapshot] = $this->resolveSpellSnapshot($replacement);

            if ($oldItemId !== null && $oldItemId !== $newItemId) {
                Item::query()
                    ->whereKey($oldItemId)
                    ->where('pick_count', '>', 0)
                    ->decrement('pick_count');
            }

            if ($oldItemId !== $newItemId) {
                Item::query()->whereKey($newItemId)->increment('pick_count');
            }

            $line->item_id = $newItemId;
            $line->item_name = $replacement['name'] ?? null;
            $line->item_url = $replacement['url'] ?? null;
            $line->item_cost = $replacement['display_cost'] ?? ($replacement['cost'] ?? null);
            $line->item_rarity = $replacement['rarity'] ?? null;
            $line->item_type = $replacement['type'] ?? null;
            $line->item_ruling_changed = (bool) ($replacement['ruling_changed'] ?? false);
            $line->item_ruling_note = $replacement['ruling_note'] ?? null;
            $line->roll_source_kind = $sourceKind;
            $line->spell_id = $spellId;
            $line->spell_name = $spellSnapshot?->name;
            $line->spell_url = $spellSnapshot?->url;
            $line->spell_legacy_url = $spellSnapshot?->legacy_url;
            $line->spell_level = $spellSnapshot?->spell_level;
            $line->spell_school = $spellSnapshot?->spell_school;
            $line->spell_ruling_changed = $spellSnapshot?->ruling_changed ?? false;
            $line->spell_ruling_note = $spellSnapshot?->ruling_note;
            $line->notes = null;
            $line->snapshot_custom = false;
            $line->save();

            return $line;
        });
    }

    public function roll(): Shop
    {
        $pickedItems = [];
        $pickedItemIds = [];

        foreach (ShopRollRule::ordered() as $rule) {
            if ($rule->row_kind === 'heading') {
                continue;
            }

            if ($rule->count <= 0) {
                continue;
            }

            $query = Item::query()
                ->select([
                    'id',
                    'name',
                    'url',
                    'cost',
                    'rarity',
                    'type',
                    'pick_count',
                    'ruling_changed',
                    'ruling_note',
                    'default_spell_roll_enabled',
                    'default_spell_levels',
                    'default_spell_schools',
                    'source_id',
                ])
                ->with('mundaneVariants:id,name,slug,category,cost_gp,is_placeholder,sort_order')
                ->where('shop_enabled', true)
                ->where('rarity', $rule->rarity);

            if ($rule->source_kind === 'official' || $rule->source_kind === 'third_party') {
                $query->whereHas('source', fn ($sourceQuery) => $sourceQuery->where('kind', $rule->source_kind));
            }

            $selectionTypes = array_values(array_unique(array_filter(
                array_map(static fn (mixed $type): string => (string) $type, $rule->selection_types ?? []),
                static fn (string $type): bool => $type !== '',
            )));

            if ($selectionTypes === []) {
                continue;
            }

            $query->whereIn('type', $selectionTypes);

            if ($pickedItemIds !== []) {
                $query->whereNotIn('id', $pickedItemIds);
            }

            $candidatePool = $query->get()
                ->map(function (Item $item) use ($rule): array {
                    $payload = $item->toArray();
                    $payload['display_cost'] = ItemCostResolver::resolveForItem($item);
                    $payload['roll_source_kind'] = $rule->source_kind;
                    $payload['roll_rule_id'] = $rule->id;

                    return $payload;
                })
                ->all();

            $picked = $this->weightedRandomSelection($candidatePool, $rule->count);
            if ($picked === []) {
                continue;
            }

            $pickedItems = array_merge($pickedItems, $picked);
            $pickedItemIds = array_values(array_unique([
                ...$pickedItemIds,
                ...array_map(static fn (array $entry): int => (int) ($entry['id'] ?? 0), $picked),
            ]));
        }

        $shop = null;

        DB::transaction(function () use (&$shop, $pickedItems, $pickedItemIds) {
            Item::query()->whereIn('id', $pickedItemIds)->increment('pick_count');
            $shop = Shop::query()->create();

            foreach ($pickedItems as $pickedItem) {
                [$spellId, $spellSnapshot] = $this->resolveSpellSnapshot($pickedItem);

                ShopItem::query()->create([
                    'shop_id' => $shop->id,
                    'item_id' => $pickedItem['id'],
                    'item_name' => $pickedItem['name'] ?? null,
                    'item_url' => $pickedItem['url'] ?? null,
                    'item_cost' => $pickedItem['display_cost'] ?? ($pickedItem['cost'] ?? null),
                    'item_rarity' => $pickedItem['rarity'] ?? null,
                    'item_type' => $pickedItem['type'] ?? null,
                    'item_ruling_changed' => (bool) ($pickedItem['ruling_changed'] ?? false),
                    'item_ruling_note' => $pickedItem['ruling_note'] ?? null,
                    'roll_source_kind' => $pickedItem['roll_source_kind'] ?? 'all',
                    'roll_rule_id' => $pickedItem['roll_rule_id'] ?? null,
                    'snapshot_custom' => false,
                    'spell_id' => $spellId,
                    'spell_name' => $spellSnapshot?->name,
                    'spell_url' => $spellSnapshot?->url,
                    'spell_legacy_url' => $spellSnapshot?->legacy_url,
                    'spell_level' => $spellSnapshot?->spell_level,
                    'spell_school' => $spellSnapshot?->spell_school,
                    'spell_ruling_changed' => $spellSnapshot?->ruling_changed ?? false,
                    'spell_ruling_note' => $spellSnapshot?->ruling_note,
                ]);
            }
        });

        return $shop;
    }
}
