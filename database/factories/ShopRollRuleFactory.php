<?php

namespace Database\Factories;

use App\Models\ShopRollRule;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ShopRollRule>
 */
class ShopRollRuleFactory extends Factory
{
    protected $model = ShopRollRule::class;

    public function definition(): array
    {
        return [
            'row_kind' => 'rule',
            'rarity' => $this->faker->randomElement(['common', 'uncommon', 'rare', 'very_rare']),
            'selection_types' => [$this->faker->randomElement(['weapon', 'armor', 'item', 'consumable', 'spellscroll'])],
            'source_kind' => $this->faker->randomElement(['all', 'official', 'third_party']),
            'heading_title' => '',
            'count' => $this->faker->numberBetween(0, 5),
            'sort_order' => $this->faker->numberBetween(1, 999),
        ];
    }
}
