<?php

namespace Database\Factories;

use App\Models\MundaneItemVariant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MundaneItemVariant>
 */
class MundaneItemVariantFactory extends Factory
{
    protected $model = MundaneItemVariant::class;

    public function definition(): array
    {
        return [
            'name' => ucfirst($this->faker->unique()->word()),
            'slug' => $this->faker->unique()->slug(),
            'category' => $this->faker->randomElement(['weapon', 'armor']),
            'cost_gp' => $this->faker->randomElement([0.10, 1.00, 5.00, 10.00, 50.00]),
            'is_placeholder' => false,
            'guild_enabled' => true,
        ];
    }
}
