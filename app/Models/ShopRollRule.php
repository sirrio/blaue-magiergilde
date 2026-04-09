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
        'row_kind',
        'rarity',
        'selection_types',
        'source_kind',
        'heading_title',
        'count',
        'sort_order',
    ];

    protected $casts = [
        'selection_types' => 'array',
        'count' => 'integer',
        'sort_order' => 'integer',
    ];

    /**
     * @return array<int, array{row_kind:string,rarity:string,selection_types:array<int, string>,source_kind:string,heading_title:string,count:int,sort_order:int}>
     */
    public static function defaults(): array
    {
        return [
            ['row_kind' => 'heading', 'rarity' => 'common', 'selection_types' => ['item'], 'source_kind' => 'all', 'heading_title' => 'Common Magic Items (Ab Low Tier)', 'count' => 0, 'sort_order' => 10],
            ['row_kind' => 'rule', 'rarity' => 'common', 'selection_types' => ['weapon', 'armor', 'item'], 'source_kind' => 'all', 'heading_title' => '', 'count' => 5, 'sort_order' => 20],
            ['row_kind' => 'heading', 'rarity' => 'common', 'selection_types' => ['item'], 'source_kind' => 'all', 'heading_title' => 'Common Consumable', 'count' => 0, 'sort_order' => 30],
            ['row_kind' => 'rule', 'rarity' => 'common', 'selection_types' => ['consumable'], 'source_kind' => 'all', 'heading_title' => '', 'count' => 1, 'sort_order' => 40],
            ['row_kind' => 'heading', 'rarity' => 'common', 'selection_types' => ['item'], 'source_kind' => 'all', 'heading_title' => 'Common Spell Scroll', 'count' => 0, 'sort_order' => 50],
            ['row_kind' => 'rule', 'rarity' => 'common', 'selection_types' => ['spellscroll'], 'source_kind' => 'all', 'heading_title' => '', 'count' => 1, 'sort_order' => 60],
            ['row_kind' => 'heading', 'rarity' => 'common', 'selection_types' => ['item'], 'source_kind' => 'all', 'heading_title' => 'Uncommon Magic Items (Ab Low Tier)', 'count' => 0, 'sort_order' => 70],
            ['row_kind' => 'rule', 'rarity' => 'uncommon', 'selection_types' => ['weapon', 'armor', 'item'], 'source_kind' => 'all', 'heading_title' => '', 'count' => 3, 'sort_order' => 80],
            ['row_kind' => 'heading', 'rarity' => 'common', 'selection_types' => ['item'], 'source_kind' => 'all', 'heading_title' => 'Uncommon Consumable', 'count' => 0, 'sort_order' => 90],
            ['row_kind' => 'rule', 'rarity' => 'uncommon', 'selection_types' => ['consumable'], 'source_kind' => 'all', 'heading_title' => '', 'count' => 1, 'sort_order' => 100],
            ['row_kind' => 'heading', 'rarity' => 'common', 'selection_types' => ['item'], 'source_kind' => 'all', 'heading_title' => 'Uncommon Spell Scroll', 'count' => 0, 'sort_order' => 110],
            ['row_kind' => 'rule', 'rarity' => 'uncommon', 'selection_types' => ['spellscroll'], 'source_kind' => 'all', 'heading_title' => '', 'count' => 1, 'sort_order' => 120],
            ['row_kind' => 'heading', 'rarity' => 'common', 'selection_types' => ['item'], 'source_kind' => 'all', 'heading_title' => 'Rare Magic Items (Ab High Tier)', 'count' => 0, 'sort_order' => 130],
            ['row_kind' => 'rule', 'rarity' => 'rare', 'selection_types' => ['weapon', 'armor', 'item'], 'source_kind' => 'all', 'heading_title' => '', 'count' => 2, 'sort_order' => 140],
            ['row_kind' => 'heading', 'rarity' => 'common', 'selection_types' => ['item'], 'source_kind' => 'all', 'heading_title' => 'Rare Consumable/Spell Scroll', 'count' => 0, 'sort_order' => 150],
            ['row_kind' => 'rule', 'rarity' => 'rare', 'selection_types' => ['consumable', 'spellscroll'], 'source_kind' => 'all', 'heading_title' => '', 'count' => 1, 'sort_order' => 160],
            ['row_kind' => 'heading', 'rarity' => 'common', 'selection_types' => ['item'], 'source_kind' => 'all', 'heading_title' => 'Very Rare Magic Items (Ab Epic Tier)', 'count' => 0, 'sort_order' => 170],
            ['row_kind' => 'rule', 'rarity' => 'very_rare', 'selection_types' => ['weapon', 'armor', 'item'], 'source_kind' => 'all', 'heading_title' => '', 'count' => 1, 'sort_order' => 180],
            ['row_kind' => 'heading', 'rarity' => 'common', 'selection_types' => ['item'], 'source_kind' => 'all', 'heading_title' => 'Very Rare Consumable/Spell Scroll', 'count' => 0, 'sort_order' => 190],
            ['row_kind' => 'rule', 'rarity' => 'very_rare', 'selection_types' => ['consumable', 'spellscroll'], 'source_kind' => 'all', 'heading_title' => '', 'count' => 1, 'sort_order' => 200],
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
