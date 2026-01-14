<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('characters')
            ->whereNull('guild_status')
            ->update(['guild_status' => 'pending']);
    }

    public function down(): void
    {
        // No-op: avoid reverting legitimate pending statuses.
    }
};
