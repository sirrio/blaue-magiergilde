<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Backfill privacy policy acceptance for users who created their account via
     * the Discord bot. These users clicked "Ja, Account erstellen" and saw the
     * legal notice, but the bot did not store the acceptance at the time.
     */
    public function up(): void
    {
        $version = (int) config('legal.privacy_policy.version', 20260214);

        DB::table('users')
            ->whereNotNull('discord_id')
            ->whereNull('privacy_policy_accepted_at')
            ->update([
                'privacy_policy_accepted_at' => DB::raw('created_at'),
                'privacy_policy_accepted_version' => $version,
            ]);
    }

    public function down(): void
    {
        // Not reversible — we cannot distinguish backfilled rows from genuine acceptances.
    }
};
