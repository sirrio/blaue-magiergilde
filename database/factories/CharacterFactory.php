<?php

namespace Database\Factories;

use App\Models\Character;
use App\Models\User;
use App\Support\LevelProgression;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Character>
 */
class CharacterFactory extends Factory
{
    protected $model = Character::class;

    public function definition(): array
    {
        $bubbleShopSpend = $this->faker->numberBetween(0, 10);

        return [
            'user_id' => User::factory(),
            'name' => $this->faker->name(),
            'external_link' => 'https://www.dndbeyond.com/characters/'.$this->faker->numberBetween(1000, 99999999),
            'start_tier' => $this->faker->randomElement(['bt', 'lt', 'ht']),
            'version' => '2024',
            'avatar' => $this->faker->imageUrl(200, 200, 'people'),
            'dm_bubbles' => $this->faker->numberBetween(0, 10),
            'dm_coins' => $this->faker->numberBetween(0, 10),
            'bubble_shop_spend' => $bubbleShopSpend,
            'bubble_shop_legacy_spend' => $bubbleShopSpend,
            'is_filler' => $this->faker->boolean(),
            'faction' => $this->faker->randomElement([
                'none', 'heiler', 'handwerker', 'feldforscher', 'bibliothekare', 'diplomaten', 'gardisten', 'unterhalter', 'logistiker', 'flora & fauna', 'waffenmeister', 'ermittler', 'arkanisten',
                'agenten',
            ]),
            'notes' => $this->faker->sentence(),
            'position' => $this->faker->numberBetween(0, 10),
            'progression_version_id' => LevelProgression::activeVersionId(),
            'simplified_tracking' => false,
            'avatar_masked' => true,
            'private_mode' => false,
        ];
    }
}
