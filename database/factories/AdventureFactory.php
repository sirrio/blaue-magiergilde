<?php

namespace Database\Factories;

use App\Models\Adventure;
use App\Models\Character;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Adventure>
 */
class AdventureFactory extends Factory
{
    protected $model = Adventure::class;

    public function definition(): array
    {
        return [
            'character_id' => Character::factory(),
            'duration' => $this->faker->numberBetween(1, 10),
            'game_master' => $this->faker->name(),
            'title' => $this->faker->sentence(3),
            'start_date' => $this->faker->date(),
            'has_additional_bubble' => $this->faker->boolean(),
            'notes' => $this->faker->paragraph(),
        ];
    }
}
