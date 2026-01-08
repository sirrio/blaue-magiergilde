<?php

namespace Database\Seeders;

use App\Models\DiscordChannel;
use App\Models\DiscordMessage;
use App\Models\DiscordMessageAttachment;
use Illuminate\Database\Seeder;

class DiscordBackupSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DiscordChannel::factory()
            ->count(2)
            ->create()
            ->each(function (DiscordChannel $channel): void {
                DiscordMessage::factory()
                    ->count(3)
                    ->create([
                        'discord_channel_id' => $channel->id,
                        'guild_id' => $channel->guild_id,
                    ])
                    ->each(function (DiscordMessage $message): void {
                        DiscordMessageAttachment::factory()
                            ->count(1)
                            ->create([
                                'discord_message_id' => $message->id,
                            ]);
                    });
            });
    }
}
