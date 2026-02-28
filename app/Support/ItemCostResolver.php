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
        if ($variants->count() === 1) {
            /** @var MundaneItemVariant $single */
            $single = $variants->first();
            $prefix = self::variantSourcePrefix($single->category);

            return $prefix.': '.self::formatSingleVariant($single);
        }

        $grouped = $variants
            ->sortBy('sort_order')
            ->groupBy('category')
            ->map(function (Collection $entries, string $category): string {
                $prefix = self::variantSourcePrefix($category);
                if ($entries->count() > 1) {
                    $summary = $entries->count().' options';

                    return $prefix.': '.$summary;
                }

                $formattedEntries = $entries
                    ->map(static fn (MundaneItemVariant $variant): string => self::formatSingleVariant($variant))
                    ->implode(', ');

                return $prefix.': '.$formattedEntries;
            })
            ->values()
            ->implode(' | ');

        return $grouped;
    }

    private static function formatSingleVariant(MundaneItemVariant $variant): string
    {
        if ($variant->cost_gp === null) {
            return $variant->name;
        }

        return $variant->name.' ('.self::formatGp((float) $variant->cost_gp).' GP)';
    }

    private static function formatGp(float $value): string
    {
        $formatted = number_format($value, 2, '.', '');

        return rtrim(rtrim($formatted, '0'), '.');
    }

    private static function variantSourcePrefix(string $category): string
    {
        return $category === 'armor' ? 'Armor base' : 'Weapon base';
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
