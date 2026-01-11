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
        Schema::table('spells', function (Blueprint $table) {
            $table->boolean('ruling_changed')->default(false)->after('spell_level');
            $table->text('ruling_note')->nullable()->after('ruling_changed');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('spells', function (Blueprint $table) {
            $table->dropColumn(['ruling_changed', 'ruling_note']);
        });
    }
};
