<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DiscordChannel>
 */
class DiscordChannelFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id' => $this->faker->numerify(str_repeat('#', 18)),
            'guild_id' => $this->faker->numerify(str_repeat('#', 18)),
            'name' => $this->faker->words(2, true),
            'type' => $this->faker->randomElement(['GuildText', 'PublicThread', 'PrivateThread', 'GuildAnnouncement']),
            'parent_id' => $this->faker->optional()->numerify(str_repeat('#', 18)),
            'is_thread' => $this->faker->boolean(),
            'last_message_id' => $this->faker->optional()->numerify(str_repeat('#', 18)),
            'last_synced_at' => $this->faker->optional()->dateTime(),
        ];
    }
}
