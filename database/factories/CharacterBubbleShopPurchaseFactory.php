<?php

namespace Database\Factories;

use App\Models\Character;
use App\Support\CharacterBubbleShop;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CharacterBubbleShopPurchase>
 */
class CharacterBubbleShopPurchaseFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'character_id' => Character::factory(),
            'type' => $this->faker->randomElement(CharacterBubbleShop::purchaseTypes()),
            'quantity' => $this->faker->numberBetween(0, 3),
            'details' => null,
        ];
    }
}
