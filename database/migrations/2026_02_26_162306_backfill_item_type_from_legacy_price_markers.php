<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('items')) {
            return;
        }

        $weaponMarkers = ['waffenpreis', 'weaponprice', 'weapon price'];
        $armorMarkers = ['rüstungspreis', 'ruestungspreis', 'armorprice', 'armor price'];

        $weaponIds = $this->collectItemIdsFromCostMarkers($weaponMarkers)
            ->merge($this->collectItemIdsFromPlaceholder('any-weapon-price-legacy'))
            ->unique()
            ->values();

        $armorIds = $this->collectItemIdsFromCostMarkers($armorMarkers)
            ->merge($this->collectItemIdsFromPlaceholder('any-armor-price-legacy'))
            ->unique()
            ->values();

        $sharedIds = $weaponIds->intersect($armorIds)->values();
        $weaponOnlyIds = $weaponIds->diff($sharedIds)->values();
        $armorOnlyIds = $armorIds->diff($sharedIds)->values();

        $this->updateItemTypes($weaponOnlyIds, 'weapon');
        $this->updateItemTypes($armorOnlyIds, 'armor');
    }

    public function down(): void
    {
        if (! Schema::hasTable('items')) {
            return;
        }

        $weaponMarkers = ['waffenpreis', 'weaponprice', 'weapon price'];
        $armorMarkers = ['rüstungspreis', 'ruestungspreis', 'armorprice', 'armor price'];

        $weaponIds = $this->collectItemIdsFromCostMarkers($weaponMarkers)
            ->merge($this->collectItemIdsFromPlaceholder('any-weapon-price-legacy'))
            ->unique()
            ->values();

        $armorIds = $this->collectItemIdsFromCostMarkers($armorMarkers)
            ->merge($this->collectItemIdsFromPlaceholder('any-armor-price-legacy'))
            ->unique()
            ->values();

        $sharedIds = $weaponIds->intersect($armorIds)->values();
        $weaponOnlyIds = $weaponIds->diff($sharedIds)->values();
        $armorOnlyIds = $armorIds->diff($sharedIds)->values();

        $this->revertItemTypes($weaponOnlyIds, 'weapon');
        $this->revertItemTypes($armorOnlyIds, 'armor');
    }

    /**
     * @param  array<int, string>  $markers
     * @return Collection<int, int>
     */
    private function collectItemIdsFromCostMarkers(array $markers): Collection
    {
        $ids = collect();

        DB::table('items')
            ->select(['id', 'cost'])
            ->where('type', 'item')
            ->orderBy('id')
            ->chunkById(500, function (Collection $items) use (&$ids, $markers): void {
                foreach ($items as $item) {
                    $normalizedCost = mb_strtolower((string) ($item->cost ?? ''));
                    if ($normalizedCost === '') {
                        continue;
                    }

                    foreach ($markers as $marker) {
                        if (str_contains($normalizedCost, $marker)) {
                            $ids->push((int) $item->id);
                            break;
                        }
                    }
                }
            });

        return $ids->unique()->values();
    }

    /**
     * @return Collection<int, int>
     */
    private function collectItemIdsFromPlaceholder(string $slug): Collection
    {
        if (! Schema::hasTable('mundane_item_variants') || ! Schema::hasTable('item_mundane_variant')) {
            return collect();
        }

        return DB::table('item_mundane_variant as pivot')
            ->join('mundane_item_variants as variants', 'variants.id', '=', 'pivot.mundane_item_variant_id')
            ->where('variants.slug', $slug)
            ->pluck('pivot.item_id')
            ->map(static fn ($id): int => (int) $id)
            ->unique()
            ->values();
    }

    /**
     * @param  Collection<int, int>  $itemIds
     */
    private function updateItemTypes(Collection $itemIds, string $type): void
    {
        if ($itemIds->isEmpty()) {
            return;
        }

        foreach ($itemIds->chunk(500) as $chunk) {
            DB::table('items')
                ->where('type', 'item')
                ->whereIn('id', $chunk->all())
                ->update(['type' => $type]);
        }
    }

    /**
     * @param  Collection<int, int>  $itemIds
     */
    private function revertItemTypes(Collection $itemIds, string $type): void
    {
        if ($itemIds->isEmpty()) {
            return;
        }

        foreach ($itemIds->chunk(500) as $chunk) {
            DB::table('items')
                ->where('type', $type)
                ->whereIn('id', $chunk->all())
                ->update(['type' => 'item']);
        }
    }
};
