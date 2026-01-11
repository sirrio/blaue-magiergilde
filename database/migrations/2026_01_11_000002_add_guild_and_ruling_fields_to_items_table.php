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
        Schema::table('items', function (Blueprint $table) {
            $table->boolean('guild_enabled')->default(true)->after('shop_enabled');
            $table->boolean('ruling_changed')->default(false)->after('guild_enabled');
            $table->text('ruling_note')->nullable()->after('ruling_changed');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn(['guild_enabled', 'ruling_changed', 'ruling_note']);
        });
    }
};
