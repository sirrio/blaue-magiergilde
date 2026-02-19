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
        if (Schema::hasColumn('discord_support_tickets', 'header_message_id')) {
            return;
        }

        Schema::table('discord_support_tickets', function (Blueprint $table) {
            $table->string('header_message_id', 32)->nullable()->after('thread_id');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('discord_support_tickets')) {
            return;
        }
        if (! Schema::hasColumn('discord_support_tickets', 'header_message_id')) {
            return;
        }

        Schema::table('discord_support_tickets', function (Blueprint $table) {
            $table->dropColumn('header_message_id');
        });
    }
};
