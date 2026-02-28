<?php

namespace App\Support;

class ItemPricing
{
    private const RARITY_BASE_COSTS = [
        'common' => 100,
        'uncommon' => 1000,
        'rare' => 5000,
        'very_rare' => 20000,
    ];

    public static function baseCostGp(?string $rarity, ?string $type): ?int
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

    public static function storageCost(?string $rarity, ?string $type): ?string
    {
        $baseCost = self::baseCostGp($rarity, $type);
        if ($baseCost === null) {
            return null;
        }

        return $baseCost.' GP';
    }

    public static function displayBaseCost(?string $rarity, ?string $type): string
    {
        $baseCost = self::baseCostGp($rarity, $type);
        if ($baseCost === null) {
            return '∞ GP';
        }

        return $baseCost.' GP';
    }
}
