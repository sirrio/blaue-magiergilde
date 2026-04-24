<?php

namespace Database\Factories;

use App\Models\Adventure;
use App\Models\Character;
use App\Support\CharacterAuditTrail;
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

    public function configure(): static
    {
        return $this->afterCreating(function (Adventure $adventure): void {
            $character = $adventure->character;
            if (! $character) {
                return;
            }
            $bubbles = intdiv((int) $adventure->duration, 10800) + ((bool) $adventure->has_additional_bubble ? 1 : 0);
            app(CharacterAuditTrail::class)->record($character, 'adventure.created', delta: [
                'bubbles' => $bubbles,
            ], subject: $adventure, metadata: ['factory' => true]);
        });
    }
}
