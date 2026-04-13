<?php

namespace App\Support;

use App\Models\Item;
use App\Models\MundaneItemVariant;
use Illuminate\Support\Collection;

class ItemCostResolver
{
    public static function resolveForItem(Item $item): ?string
    {
        $variants = $item->relationLoaded('mundaneVariants')
            ? $item->mundaneVariants
            : $item->mundaneVariants()->get();

        return self::resolve(
            rarity: $item->rarity,
            type: $item->type,
            variants: $variants,
            extraCostNote: $item->extra_cost_note,
        );
    }

    /**
     * @param  iterable<int, MundaneItemVariant>  $variants
     */
    public static function resolve(?string $rarity, ?string $type, iterable $variants, ?string $extraCostNote = null): ?string
    {
        $baseCost = ItemPricing::displayBaseCost($rarity, $type);
        $variantCollection = collect($variants)->filter(static fn ($variant) => $variant instanceof MundaneItemVariant)->values();
        $parts = [$baseCost];

        if (! $variantCollection->isEmpty()) {
            $variantLabel = self::formatVariantLabel($variantCollection);
            if ($variantLabel !== '') {
                $parts[] = $variantLabel;
            }
        }

        $normalizedExtraCostNote = self::normalizeExtraCostNote($extraCostNote);
        if ($normalizedExtraCostNote !== null) {
            $parts[] = $normalizedExtraCostNote;
        }

        return implode(' + ', $parts);
    }

    private static function formatVariantLabel(Collection $variants): string
    {
        /** @var MundaneItemVariant $first */
        $first = $variants->sortBy('name')->first();
        $prefix = self::variantSourcePrefix($first->category);

        if ($variants->count() !== 1 || $first->is_placeholder || $first->cost_gp === null) {
            return $prefix;
        }

        return $prefix.' ('.self::formatGp((float) $first->cost_gp).' GP)';
    }

    private static function formatGp(float $value): string
    {
        $formatted = number_format($value, 2, '.', '');

        return rtrim(rtrim($formatted, '0'), '.');
    }

    private static function variantSourcePrefix(string $category): string
    {
        return $category === 'armor' ? 'Armor cost' : 'Weapon cost';
    }

    private static function normalizeExtraCostNote(?string $value): ?string
    {
        $text = trim((string) ($value ?? ''));
        if ($text === '') {
            return null;
        }

        $text = preg_replace('/^\+\s*/u', '', $text) ?? $text;
        $text = trim($text);

        return $text !== '' ? $text : null;
    }
}
