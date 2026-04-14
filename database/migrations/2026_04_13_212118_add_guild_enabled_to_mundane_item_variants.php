<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mundane_item_variants', function (Blueprint $table) {
            $table->boolean('guild_enabled')->default(true)->after('is_placeholder');
        });
    }

    public function down(): void
    {
        Schema::table('mundane_item_variants', function (Blueprint $table) {
            $table->dropColumn('guild_enabled');
        });
    }
};
