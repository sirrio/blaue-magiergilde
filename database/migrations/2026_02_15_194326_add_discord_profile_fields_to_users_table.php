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
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'discord_username')) {
                $table->string('discord_username', 255)->nullable()->after('discord_id');
            }

            if (! Schema::hasColumn('users', 'discord_display_name')) {
                $table->string('discord_display_name', 255)->nullable()->after('discord_username');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (Schema::hasColumn('users', 'discord_display_name')) {
                $table->dropColumn('discord_display_name');
            }

            if (Schema::hasColumn('users', 'discord_username')) {
                $table->dropColumn('discord_username');
            }
        });
    }
};
