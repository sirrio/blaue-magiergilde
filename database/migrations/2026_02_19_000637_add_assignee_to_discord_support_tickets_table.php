<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('discord_support_tickets')) {
            return;
        }
        if (Schema::hasColumn('discord_support_tickets', 'assigned_to_discord_id')) {
            return;
        }

        Schema::table('discord_support_tickets', function (Blueprint $table) {
            $table->string('assigned_to_discord_id', 32)->nullable()->after('closed_by_discord_id');
            $table->index(['assigned_to_discord_id', 'status']);
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('discord_support_tickets')) {
            return;
        }
        if (! Schema::hasColumn('discord_support_tickets', 'assigned_to_discord_id')) {
            return;
        }

        Schema::table('discord_support_tickets', function (Blueprint $table) {
            $table->dropIndex('discord_support_tickets_assigned_to_discord_id_status_index');
            $table->dropColumn('assigned_to_discord_id');
        });
    }
};
