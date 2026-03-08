<?php

namespace App\Console\Commands;

use App\Models\Character;
use App\Services\CharacterAvatarStorageService;
use Illuminate\Console\Command;

class BackfillDiscordCharacterAvatarsCommand extends Command
{
    /**
     * @var string
     */
    protected $signature = 'characters:backfill-discord-avatars
                            {--limit=0 : Maximum number of characters to process (0 = all)}
                            {--dry-run : Validate candidates without saving files/DB changes}';

    /**
     * @var string
     */
    protected $description = 'Download Discord CDN attachment avatars into local storage for stable rendering';

    public function __construct(private readonly CharacterAvatarStorageService $avatarStorageService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $limit = max(0, (int) $this->option('limit'));
        $dryRun = (bool) $this->option('dry-run');

        $query = Character::query()
            ->whereNotNull('avatar')
            ->where('avatar', '!=', '')
            ->where(function ($builder) {
                $builder
                    ->where('avatar', 'like', 'https://cdn.discordapp.com/attachments/%')
                    ->orWhere('avatar', 'like', 'https://media.discordapp.net/attachments/%');
            })
            ->orderBy('id');

        $processed = 0;
        $migrated = 0;
        $failed = 0;

        foreach ($query->cursor() as $character) {
            if ($limit > 0 && $processed >= $limit) {
                break;
            }

            $processed++;

            $avatarUrl = trim((string) $character->avatar);
            if ($avatarUrl === '') {
                continue;
            }

            $result = $this->avatarStorageService->storeFromUrl(
                $character,
                $avatarUrl,
                persist: ! $dryRun,
            );

            if (! ($result['ok'] ?? false)) {
                $failed++;
                $this->warn(sprintf(
                    '#%d %s -> failed (%s)',
                    $character->id,
                    $character->name,
                    $result['error'] ?? 'unknown_error',
                ));

                continue;
            }

            $migrated++;
            $this->line(sprintf(
                '#%d %s -> %s%s',
                $character->id,
                $character->name,
                $result['avatar_path'] ?? 'stored',
                $dryRun ? ' (dry-run)' : '',
            ));
        }

        $this->info(sprintf(
            'Backfill complete. processed=%d migrated=%d failed=%d%s',
            $processed,
            $migrated,
            $failed,
            $dryRun ? ' (dry-run)' : '',
        ));

        return self::SUCCESS;
    }
}
