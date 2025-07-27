<?php

namespace Database\Factories;

use App\Models\Downtime;
use App\Models\Character;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Downtime>
 */
class DowntimeFactory extends Factory
{
    protected $model = Downtime::class;

    public function definition(): array
    {
        return [
            'character_id' => Character::factory(),
            'duration' => $this->faker->numberBetween(1, 10),
            'start_date' => $this->faker->date(),
            'notes' => $this->faker->paragraph(),
            'type' => $this->faker->randomElement(['faction','other']),
        ];
    }
}
