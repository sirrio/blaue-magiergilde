<?php

namespace Database\Factories;

use App\Models\DiscordChannel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DiscordMessage>
 */
class DiscordMessageFactory extends Factory
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
            'discord_channel_id' => DiscordChannel::factory(),
            'guild_id' => $this->faker->numerify(str_repeat('#', 18)),
            'author_id' => $this->faker->numerify(str_repeat('#', 18)),
            'author_name' => $this->faker->userName(),
            'author_display_name' => $this->faker->optional()->name(),
            'content' => $this->faker->optional()->sentence(),
            'message_type' => $this->faker->numberBetween(0, 10),
            'is_pinned' => $this->faker->boolean(),
            'sent_at' => $this->faker->dateTime(),
            'edited_at' => $this->faker->optional()->dateTime(),
            'payload' => [
                'content' => $this->faker->sentence(),
                'type' => 0,
            ],
        ];
    }
}
