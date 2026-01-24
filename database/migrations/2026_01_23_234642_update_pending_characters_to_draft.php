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
            ->where('guild_status', 'pending')
            ->update(['guild_status' => 'draft']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('characters')
            ->where('guild_status', 'draft')
            ->update(['guild_status' => 'pending']);
    }
};
