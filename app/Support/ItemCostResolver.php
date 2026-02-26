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

        return self::resolve((string) ($item->cost ?? ''), $variants);
    }

    /**
     * @param  iterable<int, MundaneItemVariant>  $variants
     */
    public static function resolve(?string $baseCost, iterable $variants): ?string
    {
        $normalizedBaseCost = trim((string) $baseCost);
        $variantCollection = collect($variants)->filter(static fn ($variant) => $variant instanceof MundaneItemVariant)->values();

        if ($variantCollection->isEmpty()) {
            return $normalizedBaseCost === '' ? null : $normalizedBaseCost;
        }

        if (self::isLegacyPlaceholderString($normalizedBaseCost, $variantCollection)) {
            return $normalizedBaseCost;
        }

        $variantLabel = self::formatVariantLabel($variantCollection);
        if ($variantLabel === '') {
            return $normalizedBaseCost === '' ? null : $normalizedBaseCost;
        }

        if ($normalizedBaseCost === '') {
            return $variantLabel;
        }

        return $normalizedBaseCost.' + '.$variantLabel;
    }

    private static function isLegacyPlaceholderString(string $baseCost, Collection $variants): bool
    {
        if ($baseCost === '') {
            return false;
        }

        $containsWeaponPlaceholder = str_contains(mb_strtolower($baseCost), 'waffenpreis');
        $containsArmorPlaceholder = str_contains(mb_strtolower($baseCost), 'rüstungspreis')
            || str_contains(mb_strtolower($baseCost), 'ruestungspreis');

        if (! $containsWeaponPlaceholder && ! $containsArmorPlaceholder) {
            return false;
        }

        return $variants->every(static fn (MundaneItemVariant $variant) => $variant->is_placeholder);
    }

    private static function formatVariantLabel(Collection $variants): string
    {
        if ($variants->count() === 1) {
            /** @var MundaneItemVariant $single */
            $single = $variants->first();

            return self::formatSingleVariant($single);
        }

        $grouped = $variants
            ->sortBy('sort_order')
            ->groupBy('category')
            ->map(function (Collection $entries, string $category): string {
                $prefix = $category === 'armor' ? 'Armor' : 'Weapon';
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
}
