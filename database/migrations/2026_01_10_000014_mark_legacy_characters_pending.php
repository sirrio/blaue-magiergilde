<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('characters')
            ->where('guild_status', 'approved')
            ->update(['guild_status' => 'pending']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('characters')
            ->where('guild_status', 'pending')
            ->update(['guild_status' => 'approved']);
    }
};
