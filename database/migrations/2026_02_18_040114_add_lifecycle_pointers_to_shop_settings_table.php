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
        Schema::table('shop_settings', function (Blueprint $table) {
            $table->foreignId('current_shop_id')
                ->nullable()
                ->after('last_auto_posted_at')
                ->constrained('shops')
                ->nullOnDelete();
            $table->foreignId('draft_shop_id')
                ->nullable()
                ->after('current_shop_id')
                ->constrained('shops')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shop_settings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('draft_shop_id');
            $table->dropConstrainedForeignId('current_shop_id');
        });
    }
};
