<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const RARITY_BASE_COSTS = [
        'common' => 100,
        'uncommon' => 1000,
        'rare' => 5000,
        'very_rare' => 20000,
    ];

    public function up(): void
    {
        if (! Schema::hasTable('items')) {
            return;
        }

        $this->normalizeItemCostFields();
        $this->backfillSnapshotCosts('item_shop');
        $this->backfillSnapshotCosts('auction_items');
        $this->backfillSnapshotCosts('backstock_items');
    }

    public function down(): void
    {
        // Intentionally irreversible data normalization/backfill.
    }

    private function normalizeItemCostFields(): void
    {
        DB::table('items')
            ->select(['id', 'type', 'rarity', 'cost', 'extra_cost_note'])
            ->orderBy('id')
            ->chunkById(500, function (Collection $items): void {
                foreach ($items as $item) {
                    $type = (string) ($item->type ?? '');
                    $normalizedCost = $this->storageCost($item->rarity, $type);
                    $normalizedNote = $this->normalizeExtraCostNote(
                        $item->extra_cost_note,
                        $item->cost,
                        $type,
                    );

                    $updates = [];
                    if ((string) ($item->cost ?? '') !== (string) ($normalizedCost ?? '')) {
                        $updates['cost'] = $normalizedCost;
                    }
                    if ((string) ($item->extra_cost_note ?? '') !== (string) ($normalizedNote ?? '')) {
                        $updates['extra_cost_note'] = $normalizedNote;
                    }

                    if ($updates !== []) {
                        DB::table('items')
                            ->where('id', (int) $item->id)
                            ->update($updates);
                    }
                }
            });
    }

    private function backfillSnapshotCosts(string $table): void
    {
        if (! Schema::hasTable($table)) {
            return;
        }

        DB::table($table)
            ->whereNotNull('item_id')
            ->where(function ($query): void {
                $query->whereNull('snapshot_custom')->orWhere('snapshot_custom', false);
            })
            ->orderBy('id')
            ->chunkById(500, function (Collection $rows) use ($table): void {
                $itemIds = $rows
                    ->pluck('item_id')
                    ->map(static fn ($id): int => (int) $id)
                    ->filter(static fn ($id): bool => $id > 0)
                    ->unique()
                    ->values()
                    ->all();

                if ($itemIds === []) {
                    return;
                }

                $resolvedCosts = $this->resolvedCostsForItems($itemIds);

                foreach ($rows as $row) {
                    $itemId = (int) ($row->item_id ?? 0);
                    $resolved = $resolvedCosts[$itemId] ?? null;
                    if ($resolved === null) {
                        continue;
                    }

                    if ((string) ($row->item_cost ?? '') === $resolved) {
                        continue;
                    }

                    DB::table($table)
                        ->where('id', (int) $row->id)
                        ->update([
                            'item_cost' => $resolved,
                        ]);
                }
            });
    }

    /**
     * @param  array<int, int>  $itemIds
     * @return array<int, string>
     */
    private function resolvedCostsForItems(array $itemIds): array
    {
        $items = DB::table('items')
            ->whereIn('id', $itemIds)
            ->get(['id', 'type', 'rarity', 'cost', 'extra_cost_note'])
            ->keyBy('id');

        if ($items->isEmpty()) {
            return [];
        }

        $variantsByItem = DB::table('item_mundane_variant as pivot')
            ->join('mundane_item_variants as variant', 'variant.id', '=', 'pivot.mundane_item_variant_id')
            ->whereIn('pivot.item_id', $itemIds)
            ->orderBy('variant.sort_order')
            ->orderBy('variant.name')
            ->get([
                'pivot.item_id',
                'variant.name',
                'variant.category',
                'variant.cost_gp',
                'variant.sort_order',
            ])
            ->groupBy('item_id');

        $resolved = [];
        foreach ($itemIds as $itemId) {
            $item = $items->get($itemId);
            if (! $item) {
                continue;
            }

            $parts = [$this->displayBaseCost($item->rarity, $item->type)];
            $variantLabel = $this->formatVariantLabel(collect($variantsByItem->get($itemId, [])));
            if ($variantLabel !== '') {
                $parts[] = $variantLabel;
            }

            $note = $this->normalizeExtraCostNote($item->extra_cost_note, $item->cost, (string) $item->type);
            if ($note !== null) {
                $parts[] = $note;
            }

            $resolved[$itemId] = implode(' + ', $parts);
        }

        return $resolved;
    }

    private function displayBaseCost(?string $rarity, ?string $type): string
    {
        $baseCost = $this->baseCostGp($rarity, $type);
        if ($baseCost === null) {
            return '∞ GP';
        }

        return $baseCost.' GP';
    }

    private function storageCost(?string $rarity, ?string $type): ?string
    {
        $baseCost = $this->baseCostGp($rarity, $type);
        if ($baseCost === null) {
            return null;
        }

        return $baseCost.' GP';
    }

    private function baseCostGp(?string $rarity, ?string $type): ?int
    {
        $normalizedRarity = (string) $rarity;
        $normalizedType = (string) $type;
        $base = self::RARITY_BASE_COSTS[$normalizedRarity] ?? null;

        if ($base === null) {
            return null;
        }

        if (in_array($normalizedType, ['consumable', 'spellscroll'], true)) {
            return intdiv($base, 2);
        }

        if (in_array($normalizedType, ['weapon', 'armor', 'item'], true)) {
            return $base;
        }

        return null;
    }

    private function normalizeExtraCostNote(mixed $note, mixed $legacyCost, string $type): ?string
    {
        if (in_array($type, ['weapon', 'armor'], true)) {
            return null;
        }

        $value = trim((string) ($note ?? ''));
        if ($value === '') {
            $value = $this->extractLegacyCostSuffix($legacyCost);
        }
        if ($value === '') {
            return null;
        }

        $value = preg_replace('/^\+\s*/u', '', $value) ?? $value;
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        $normalized = mb_strtolower($value);
        if (in_array($normalized, ['waffenpreis', 'weaponprice', 'weapon price', 'rüstungspreis', 'ruestungspreis', 'armorprice', 'armor price'], true)) {
            return null;
        }

        if (preg_match('/^(componentpreis|komponentenpreis|component\s*price|component\s*cost)$/iu', $value) === 1) {
            return 'Component cost';
        }

        return $value;
    }

    private function extractLegacyCostSuffix(mixed $legacyCost): string
    {
        $value = trim((string) ($legacyCost ?? ''));
        if ($value === '') {
            return '';
        }

        if (preg_match('/\+\s*(.+)$/u', $value, $matches) !== 1) {
            return '';
        }

        return trim((string) ($matches[1] ?? ''));
    }

    private function formatVariantLabel(Collection $variants): string
    {
        if ($variants->isEmpty()) {
            return '';
        }

        if ($variants->count() === 1) {
            $single = $variants->first();

            return $this->variantSourcePrefix((string) $single->category).': '.$this->formatSingleVariant($single);
        }

        return $variants
            ->groupBy('category')
            ->map(function (Collection $entries, string $category): string {
                $prefix = $this->variantSourcePrefix($category);
                if ($entries->count() > 1) {
                    return $prefix.': '.$entries->count().' options';
                }

                return $prefix.': '.$this->formatSingleVariant($entries->first());
            })
            ->values()
            ->implode(' | ');
    }

    private function formatSingleVariant(object $variant): string
    {
        if ($variant->cost_gp === null) {
            return (string) $variant->name;
        }

        return (string) $variant->name.' ('.$this->formatGp((float) $variant->cost_gp).' GP)';
    }

    private function formatGp(float $value): string
    {
        $formatted = number_format($value, 2, '.', '');

        return rtrim(rtrim($formatted, '0'), '.');
    }

    private function variantSourcePrefix(string $category): string
    {
        return $category === 'armor' ? 'Armor base' : 'Weapon base';
    }
};
