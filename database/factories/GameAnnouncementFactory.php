<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\GameAnnouncement>
 */
class GameAnnouncementFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'discord_channel_id' => (string) $this->faker->numberBetween(100000000000000000, 999999999999999999),
            'discord_guild_id' => (string) $this->faker->numberBetween(100000000000000000, 999999999999999999),
            'discord_message_id' => (string) $this->faker->unique()->numberBetween(100000000000000000, 999999999999999999),
            'discord_author_id' => (string) $this->faker->numberBetween(100000000000000000, 999999999999999999),
            'discord_author_name' => $this->faker->userName(),
            'discord_author_avatar_url' => $this->faker->imageUrl(128, 128),
            'title' => $this->faker->sentence(3),
            'content' => $this->faker->sentence(12),
            'tier' => $this->faker->randomElement(['bt', 'lt', 'ht', 'et']),
            'starts_at' => $this->faker->dateTimeBetween('-1 month', '+1 month')->format('Y-m-d H:i:s'),
            'posted_at' => $this->faker->dateTimeBetween('-2 months', 'now')->format('Y-m-d H:i:s'),
            'confidence' => $this->faker->randomFloat(2, 0.6, 1),
        ];
    }
}
