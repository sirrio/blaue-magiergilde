<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('discord_support_tickets')) {
            return;
        }

        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE `discord_support_tickets` MODIFY `status` ENUM('open', 'pending_user', 'pending_staff', 'closed') NOT NULL DEFAULT 'open'");
    }

    public function down(): void
    {
        if (! Schema::hasTable('discord_support_tickets')) {
            return;
        }

        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("UPDATE `discord_support_tickets` SET `status` = 'open' WHERE `status` IN ('pending_user', 'pending_staff')");
        DB::statement("ALTER TABLE `discord_support_tickets` MODIFY `status` ENUM('open', 'closed') NOT NULL DEFAULT 'open'");
    }
};
