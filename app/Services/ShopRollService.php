<?php

namespace App\Services;

use App\Models\Item;
use App\Models\Shop;
use App\Models\ShopItem;
use App\Models\Spell;
use Illuminate\Support\Facades\DB;

class ShopRollService
{
    private function normalizeSelectionType(string $rarity, string $type): string
    {
        if (in_array($rarity, ['rare', 'very_rare', 'legendary', 'artifact'], true) && in_array($type, ['consumable', 'spellscroll'], true)) {
            return 'consumable';
        }

        return $type;
    }

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
            ->select(['id', 'name', 'url', 'legacy_url', 'spell_level', 'spell_school'])
            ->whereIn('spell_level', $normalizedLevels);
        if ($normalizedSchools !== []) {
            $query->whereIn('spell_school', $normalizedSchools);
        }

        $spellSnapshot = $query->inRandomOrder()->first();
        $spellId = $spellSnapshot?->id;

        return [$spellId, $spellSnapshot];
    }

    private function pickLineReplacement(string $rarity, string $type, ?int $excludeItemId = null): ?array
    {
        $selectionType = $this->normalizeSelectionType($rarity, $type);

        $query = Item::query()
            ->select([
                'id',
                'name',
                'url',
                'cost',
                'rarity',
                'type',
                'pick_count',
                'default_spell_roll_enabled',
                'default_spell_levels',
                'default_spell_schools',
            ])
            ->where('shop_enabled', true)
            ->where('rarity', $rarity);

        if ($selectionType === 'consumable' && in_array($rarity, ['rare', 'very_rare', 'legendary', 'artifact'], true)) {
            $query->whereIn('type', ['consumable', 'spellscroll']);
        } else {
            $query->where('type', $selectionType);
        }

        $candidates = $query->get();
        if ($candidates->isEmpty()) {
            return null;
        }

        $candidatePool = $candidates->map(static fn (Item $item) => $item->toArray())->all();
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
            $replacement = $this->pickLineReplacement($rarity, $type, $oldItemId);

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
            $line->item_cost = $replacement['cost'] ?? null;
            $line->item_rarity = $replacement['rarity'] ?? null;
            $line->item_type = $replacement['type'] ?? null;
            $line->spell_id = $spellId;
            $line->spell_name = $spellSnapshot?->name;
            $line->spell_url = $spellSnapshot?->url;
            $line->spell_legacy_url = $spellSnapshot?->legacy_url;
            $line->spell_level = $spellSnapshot?->spell_level;
            $line->spell_school = $spellSnapshot?->spell_school;
            $line->notes = null;
            $line->snapshot_custom = false;
            $line->save();

            return $line;
        });
    }

    public function roll(): Shop
    {
        $items = Item::query()
            ->where('shop_enabled', true)
            ->get()
            ->groupBy(['rarity', function ($item) {
                return $this->normalizeSelectionType($item->rarity, $item->type);
            }]);

        $selectionRules = [
            'common' => ['item' => 5, 'consumable' => 1, 'spellscroll' => 1],
            'uncommon' => ['item' => 3, 'consumable' => 1, 'spellscroll' => 1],
            'rare' => ['item' => 2, 'consumable' => 1, 'spellscroll' => 0],
            'very_rare' => ['item' => 1, 'consumable' => 1, 'spellscroll' => 0],
        ];

        $pickedItems = [];

        foreach ($selectionRules as $rarity => $typeRules) {
            foreach ($typeRules as $type => $count) {
                if (isset($items[$rarity][$type])) {
                    $itemsArray = $items[$rarity][$type]->toArray();
                    $picked = $this->weightedRandomSelection($itemsArray, $count);
                    $pickedItems = array_merge($pickedItems, $picked);
                }
            }
        }

        $pickedItemIds = array_column($pickedItems, 'id');
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
                    'item_cost' => $pickedItem['cost'] ?? null,
                    'item_rarity' => $pickedItem['rarity'] ?? null,
                    'item_type' => $pickedItem['type'] ?? null,
                    'snapshot_custom' => false,
                    'spell_id' => $spellId,
                    'spell_name' => $spellSnapshot?->name,
                    'spell_url' => $spellSnapshot?->url,
                    'spell_legacy_url' => $spellSnapshot?->legacy_url,
                    'spell_level' => $spellSnapshot?->spell_level,
                    'spell_school' => $spellSnapshot?->spell_school,
                ]);
            }
        });

        return $shop;
    }
}
