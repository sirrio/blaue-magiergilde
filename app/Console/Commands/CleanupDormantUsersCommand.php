<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class CleanupDormantUsersCommand extends Command
{
    protected $signature = 'users:cleanup-dormant
                            {--months=6 : Minimum age in months before an account qualifies}
                            {--dry-run : Show how many users would be soft-deleted without changing data}';

    protected $description = 'Soft-delete non-admin users older than the configured age that have no non-deleted characters';

    public function handle(): int
    {
        $months = max(1, (int) $this->option('months'));
        $dryRun = (bool) $this->option('dry-run');
        $cutoff = now()->subMonths($months);

        $query = User::query()
            ->where('is_admin', false)
            ->where('created_at', '<', $cutoff)
            ->whereDoesntHave('characters')
            ->orderBy('id');

        $total = (clone $query)->count();

        if ($total === 0) {
            $this->info(sprintf(
                'No dormant users found older than %d month%s.',
                $months,
                $months === 1 ? '' : 's',
            ));

            return self::SUCCESS;
        }

        if ($dryRun) {
            $this->info(sprintf(
                'Dry run: %d dormant user%s would be soft-deleted (older than %d month%s).',
                $total,
                $total === 1 ? '' : 's',
                $months,
                $months === 1 ? '' : 's',
            ));

            return self::SUCCESS;
        }

        $deleted = 0;

        foreach ($query->cursor() as $user) {
            $user->delete();
            $deleted++;
        }

        $this->info(sprintf(
            'Soft-deleted %d dormant user%s older than %d month%s.',
            $deleted,
            $deleted === 1 ? '' : 's',
            $months,
            $months === 1 ? '' : 's',
        ));

        return self::SUCCESS;
    }
}
