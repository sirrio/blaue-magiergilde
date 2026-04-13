<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('character_subclasses', function (Blueprint $table) {
            $table->boolean('guild_enabled')->default(true)->after('source_id');
        });
    }

    public function down(): void
    {
        Schema::table('character_subclasses', function (Blueprint $table) {
            $table->dropColumn('guild_enabled');
        });
    }
};
