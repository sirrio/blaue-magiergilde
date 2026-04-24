<?php

namespace Database\Factories;

use App\Models\Character;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CharacterAuditEvent>
 */
class CharacterAuditEventFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'character_id' => Character::factory(),
            'actor_user_id' => null,
            'action' => 'character.legacy_snapshot',
            'occurred_at' => now(),
            'subject_type' => 'character',
            'subject_id' => null,
            'delta' => null,
            'state_after' => null,
            'metadata' => null,
        ];
    }
}
