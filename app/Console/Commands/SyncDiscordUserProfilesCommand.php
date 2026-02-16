<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class SyncDiscordUserProfilesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'users:sync-discord-profiles
                            {--only-missing : Sync only users with missing Discord username/display name}
                            {--limit=0 : Maximum number of users to process (0 = all)}
                            {--dry-run : Show changes without saving}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Backfill Discord username/display name for linked users via Discord API';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $token = trim((string) config('services.discord.bot_token'));
        if ($token === '') {
            $this->error('Missing DISCORD_BOT_TOKEN (config: services.discord.bot_token).');

            return self::FAILURE;
        }

        $onlyMissing = (bool) $this->option('only-missing');
        $dryRun = (bool) $this->option('dry-run');
        $limit = max(0, (int) $this->option('limit'));

        $query = User::query()
            ->whereNotNull('discord_id')
            ->orderBy('id')
            ->select(['id', 'discord_id', 'discord_username', 'discord_display_name']);

        if ($onlyMissing) {
            $query->where(function ($builder) {
                $builder
                    ->whereNull('discord_username')
                    ->orWhere('discord_username', '')
                    ->orWhereNull('discord_display_name')
                    ->orWhere('discord_display_name', '');
            });
        }

        $processed = 0;
        $updated = 0;
        $unchanged = 0;
        $failed = 0;

        foreach ($query->cursor() as $user) {
            if ($limit > 0 && $processed >= $limit) {
                break;
            }

            $processed++;

            $discordId = trim((string) $user->discord_id);
            if ($discordId === '') {
                $failed++;

                continue;
            }

            $response = Http::acceptJson()
                ->withToken($token, 'Bot')
                ->timeout(10)
                ->retry(2, 200, throw: false)
                ->get("https://discord.com/api/v10/users/{$discordId}");

            if ($response->failed()) {
                $failed++;
                $this->warn("Failed [{$response->status()}] for user #{$user->id} (discord_id={$discordId}).");

                continue;
            }

            $payload = $response->json();
            if (! is_array($payload)) {
                $failed++;
                $this->warn("Invalid API payload for user #{$user->id} (discord_id={$discordId}).");

                continue;
            }

            $username = $this->normalizeNullableString($payload['username'] ?? null);
            $displayName = $this->normalizeNullableString($payload['global_name'] ?? null);

            $currentUsername = $this->normalizeNullableString($user->discord_username);
            $currentDisplayName = $this->normalizeNullableString($user->discord_display_name);

            $hasChanges = $currentUsername !== $username || $currentDisplayName !== $displayName;
            if (! $hasChanges) {
                $unchanged++;

                continue;
            }

            if ($dryRun) {
                $updated++;
                $this->line("Would update user #{$user->id}: username='{$username}' display_name='{$displayName}'");

                continue;
            }

            $user->forceFill([
                'discord_username' => $username,
                'discord_display_name' => $displayName,
            ])->save();

            $updated++;
        }

        $this->info(sprintf(
            'Sync complete. processed=%d updated=%d unchanged=%d failed=%d%s',
            $processed,
            $updated,
            $unchanged,
            $failed,
            $dryRun ? ' (dry-run)' : ''
        ));

        return self::SUCCESS;
    }

    private function normalizeNullableString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed !== '' ? $trimmed : null;
    }
}
