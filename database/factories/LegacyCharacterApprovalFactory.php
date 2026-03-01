<?php

namespace Database\Factories;

use App\Models\LegacyCharacterApproval;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<LegacyCharacterApproval>
 */
class LegacyCharacterApprovalFactory extends Factory
{
    protected $model = LegacyCharacterApproval::class;

    public function definition(): array
    {
        return [
            'discord_name' => fake()->userName(),
            'player_name' => fake()->name(),
            'room' => fake()->randomElement(['1.13', 'A12', 'Taverne']),
            'tier' => fake()->randomElement(['bt', 'lt', 'ht', 'et']),
            'character_name' => fake()->firstName(),
            'external_link' => 'https://www.dndbeyond.com/characters/'.fake()->unique()->numberBetween(100000, 999999999),
            'dndbeyond_character_id' => fake()->unique()->numberBetween(100000, 999999999),
            'source_row' => fake()->numberBetween(2, 500),
            'source_column' => fake()->randomElement(['bt', 'lt', 'ht', 'et']),
        ];
    }
}
