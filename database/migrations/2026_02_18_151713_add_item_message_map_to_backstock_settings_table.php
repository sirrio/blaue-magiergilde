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
        if (! Schema::hasColumn('backstock_settings', 'last_post_item_message_ids')) {
            Schema::table('backstock_settings', function (Blueprint $table): void {
                $table->json('last_post_item_message_ids')->nullable()->after('last_post_message_ids');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('backstock_settings', 'last_post_item_message_ids')) {
            Schema::table('backstock_settings', function (Blueprint $table): void {
                $table->dropColumn('last_post_item_message_ids');
            });
        }
    }
};
