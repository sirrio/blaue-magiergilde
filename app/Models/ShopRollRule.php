<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class ShopRollRule extends Model
{
    /** @use HasFactory<\Database\Factories\ShopRollRuleFactory> */
    use HasFactory;

    protected $fillable = [
        'rarity',
        'selection_types',
        'source_kind',
        'section_title',
        'count',
        'sort_order',
    ];

    protected $casts = [
        'selection_types' => 'array',
        'count' => 'integer',
        'sort_order' => 'integer',
    ];

    /**
     * @return array<int, array{rarity:string,selection_types:array<int, string>,source_kind:string,section_title:string,count:int,sort_order:int}>
     */
    public static function defaults(): array
    {
        return [
            ['rarity' => 'common', 'selection_types' => ['weapon', 'armor', 'item'], 'source_kind' => 'all', 'section_title' => 'Common Magic Items (Ab Low Tier)', 'count' => 5, 'sort_order' => 10],
            ['rarity' => 'common', 'selection_types' => ['consumable'], 'source_kind' => 'all', 'section_title' => 'Common Consumable', 'count' => 1, 'sort_order' => 20],
            ['rarity' => 'common', 'selection_types' => ['spellscroll'], 'source_kind' => 'all', 'section_title' => 'Common Spell Scroll', 'count' => 1, 'sort_order' => 30],
            ['rarity' => 'uncommon', 'selection_types' => ['weapon', 'armor', 'item'], 'source_kind' => 'all', 'section_title' => 'Uncommon Magic Items (Ab Low Tier)', 'count' => 3, 'sort_order' => 40],
            ['rarity' => 'uncommon', 'selection_types' => ['consumable'], 'source_kind' => 'all', 'section_title' => 'Uncommon Consumable', 'count' => 1, 'sort_order' => 50],
            ['rarity' => 'uncommon', 'selection_types' => ['spellscroll'], 'source_kind' => 'all', 'section_title' => 'Uncommon Spell Scroll', 'count' => 1, 'sort_order' => 60],
            ['rarity' => 'rare', 'selection_types' => ['weapon', 'armor', 'item'], 'source_kind' => 'all', 'section_title' => 'Rare Magic Items (Ab High Tier)', 'count' => 2, 'sort_order' => 70],
            ['rarity' => 'rare', 'selection_types' => ['consumable', 'spellscroll'], 'source_kind' => 'all', 'section_title' => 'Rare Consumable/Spell Scroll', 'count' => 1, 'sort_order' => 80],
            ['rarity' => 'rare', 'selection_types' => ['spellscroll'], 'source_kind' => 'all', 'section_title' => 'Rare Spell Scroll', 'count' => 0, 'sort_order' => 90],
            ['rarity' => 'very_rare', 'selection_types' => ['weapon', 'armor', 'item'], 'source_kind' => 'all', 'section_title' => 'Very Rare Magic Items (Ab Epic Tier)', 'count' => 1, 'sort_order' => 100],
            ['rarity' => 'very_rare', 'selection_types' => ['consumable', 'spellscroll'], 'source_kind' => 'all', 'section_title' => 'Very Rare Consumable/Spell Scroll', 'count' => 1, 'sort_order' => 110],
            ['rarity' => 'very_rare', 'selection_types' => ['spellscroll'], 'source_kind' => 'all', 'section_title' => 'Very Rare Spell Scroll', 'count' => 0, 'sort_order' => 120],
        ];
    }

    public static function ensureDefaults(): void
    {
        if (static::query()->exists()) {
            return;
        }

        $timestamp = Carbon::now();

        static::query()->insert(array_map(
            static fn (array $rule): array => array_merge($rule, [
                'selection_types' => json_encode($rule['selection_types'], JSON_THROW_ON_ERROR),
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ]),
            static::defaults(),
        ));
    }

    /**
     * @return Collection<int, self>
     */
    public static function ordered(): Collection
    {
        static::ensureDefaults();

        return static::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();
    }
}
