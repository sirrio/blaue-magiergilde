<?php

namespace Database\Factories;

use App\Models\Character;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Character>
 */
class CharacterFactory extends Factory
{
    protected $model = Character::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => $this->faker->name(),
            'external_link' => $this->faker->url(),
            'start_tier' => $this->faker->randomElement(['bt', 'lt', 'ht']),
            'version' => '2024',
            'avatar' => $this->faker->imageUrl(200, 200, 'people'),
            'dm_bubbles' => $this->faker->numberBetween(0, 10),
            'dm_coins' => $this->faker->numberBetween(0, 10),
            'bubble_shop_spend' => $this->faker->numberBetween(0, 10),
            'is_filler' => $this->faker->boolean(),
            'faction' => $this->faker->randomElement([
                'none', 'heiler', 'handwerker', 'feldforscher', 'bibliothekare', 'diplomaten', 'gardisten', 'unterhalter', 'logistiker', 'flora & fauna', 'waffenmeister', 'ermittler', 'arkanisten',
            ]),
            'notes' => $this->faker->sentence(),
            'position' => $this->faker->numberBetween(0, 10),
        ];
    }
}
