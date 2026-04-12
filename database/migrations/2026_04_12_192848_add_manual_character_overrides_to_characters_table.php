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
        Schema::table('characters', function (Blueprint $table): void {
            $table->unsignedInteger('manual_adventures_count')->nullable()->after('bubble_shop_spend');
            $table->unsignedTinyInteger('manual_faction_rank')->nullable()->after('manual_adventures_count');
            $table->unsignedInteger('manual_remaining_downtime_seconds')->nullable()->after('manual_faction_rank');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('characters', function (Blueprint $table): void {
            $table->dropColumn([
                'manual_adventures_count',
                'manual_faction_rank',
                'manual_remaining_downtime_seconds',
            ]);
        });
    }
};
