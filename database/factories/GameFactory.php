<?php

namespace Database\Factories;

use App\Models\Game;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Game>
 */
class GameFactory extends Factory
{
    protected $model = Game::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'duration' => $this->faker->numberBetween(1, 10),
            'title' => $this->faker->sentence(3),
            'start_date' => $this->faker->date(),
            'has_additional_bubble' => $this->faker->boolean(),
            'sessions' => $this->faker->numberBetween(1, 5),
            'notes' => $this->faker->paragraph(),
            'tier' => $this->faker->randomElement(['bt','lt','ht']),
        ];
    }
}
