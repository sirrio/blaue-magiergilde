<?php

namespace Database\Factories;

use App\Models\Item;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Item>
 */
class ItemFactory extends Factory
{
    protected $model = Item::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->word(),
            'url' => $this->faker->url(),
            'cost' => $this->faker->randomElement(['50 GP', '100 GP', '1000 GP']),
            'rarity' => $this->faker->randomElement(['common', 'uncommon', 'rare', 'very_rare']),
            'type' => $this->faker->randomElement(['weapon', 'armor', 'item', 'consumable', 'spellscroll']),
            'pick_count' => $this->faker->numberBetween(0, 5),
        ];
    }
}
