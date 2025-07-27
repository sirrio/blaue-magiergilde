<?php

namespace Database\Factories;

use App\Models\Spell;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Spell>
 */
class SpellFactory extends Factory
{
    protected $model = Spell::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->words(2, true),
            'url' => $this->faker->optional()->url(),
            'legacy_url' => $this->faker->optional()->url(),
            'spell_school' => $this->faker->randomElement([
                'abjuration', 'conjuration', 'divination', 'enchantment', 'evocation', 'illusion', 'necromancy', 'transmutation'
            ]),
            'spell_level' => $this->faker->numberBetween(0, 9),
        ];
    }
}
