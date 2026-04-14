<?php

namespace Database\Factories;

use App\Models\CharacterClass;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CharacterClass>
 */
class CharacterClassFactory extends Factory
{
    protected $model = CharacterClass::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->word(),
        ];
    }
}
