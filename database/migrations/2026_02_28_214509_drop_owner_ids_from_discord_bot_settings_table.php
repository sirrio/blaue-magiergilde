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
        Schema::table('discord_bot_settings', function (Blueprint $table) {
            if (Schema::hasColumn('discord_bot_settings', 'owner_ids')) {
                $table->dropColumn('owner_ids');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('discord_bot_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('discord_bot_settings', 'owner_ids')) {
                $table->json('owner_ids')->nullable()->after('id');
            }
        });
    }
};
