<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('game_announcements', function (Blueprint $table) {
            $table->string('discord_author_avatar_url', 2048)->nullable()->after('discord_author_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('game_announcements', function (Blueprint $table) {
            $table->dropColumn('discord_author_avatar_url');
        });
    }
};
