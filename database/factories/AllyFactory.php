<?php

namespace Database\Factories;

use App\Models\Ally;
use App\Models\Character;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Ally>
 */
class AllyFactory extends Factory
{
    protected $model = Ally::class;

    public function definition(): array
    {
        return [
            'character_id' => Character::factory(),
            'name' => $this->faker->name(),
            'rating' => $this->faker->numberBetween(1, 5),
            'avatar' => $this->faker->imageUrl(200, 200, 'people'),
            'notes' => $this->faker->sentence(),
            'species' => $this->faker->word(),
            'classes' => $this->faker->word(),
        ];
    }
}
