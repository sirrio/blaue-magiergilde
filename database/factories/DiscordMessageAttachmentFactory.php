<?php

namespace Database\Factories;

use App\Models\DiscordMessage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\DiscordMessageAttachment>
 */
class DiscordMessageAttachmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'discord_message_id' => DiscordMessage::factory(),
            'attachment_id' => $this->faker->numerify(str_repeat('#', 18)),
            'filename' => $this->faker->word().'.png',
            'content_type' => 'image/png',
            'size' => $this->faker->numberBetween(10, 200000),
            'url' => $this->faker->url(),
            'storage_path' => $this->faker->filePath(),
        ];
    }
}
