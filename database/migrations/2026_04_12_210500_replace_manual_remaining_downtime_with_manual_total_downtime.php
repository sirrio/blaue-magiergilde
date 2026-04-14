<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('characters', 'manual_total_downtime_seconds')) {
            Schema::table('characters', function (Blueprint $table): void {
                $table->unsignedInteger('manual_total_downtime_seconds')->nullable()->after('manual_faction_rank');
            });
        }

        if (Schema::hasColumn('characters', 'manual_remaining_downtime_seconds')) {
            $usedDowntimeByCharacter = DB::table('downtimes')
                ->selectRaw('character_id, COALESCE(SUM(duration), 0) as used_duration')
                ->whereNull('deleted_at')
                ->groupBy('character_id')
                ->pluck('used_duration', 'character_id');

            DB::table('characters')
                ->select(['id', 'manual_remaining_downtime_seconds'])
                ->whereNotNull('manual_remaining_downtime_seconds')
                ->orderBy('id')
                ->chunkById(100, function ($characters) use ($usedDowntimeByCharacter): void {
                    foreach ($characters as $character) {
                        DB::table('characters')
                            ->where('id', $character->id)
                            ->update([
                                'manual_total_downtime_seconds' => (int) $character->manual_remaining_downtime_seconds + (int) ($usedDowntimeByCharacter[$character->id] ?? 0),
                            ]);
                    }
                });

            Schema::table('characters', function (Blueprint $table): void {
                $table->dropColumn('manual_remaining_downtime_seconds');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasColumn('characters', 'manual_remaining_downtime_seconds')) {
            Schema::table('characters', function (Blueprint $table): void {
                $table->unsignedInteger('manual_remaining_downtime_seconds')->nullable()->after('manual_faction_rank');
            });
        }

        if (Schema::hasColumn('characters', 'manual_total_downtime_seconds')) {
            $usedDowntimeByCharacter = DB::table('downtimes')
                ->selectRaw('character_id, COALESCE(SUM(duration), 0) as used_duration')
                ->whereNull('deleted_at')
                ->groupBy('character_id')
                ->pluck('used_duration', 'character_id');

            DB::table('characters')
                ->select(['id', 'manual_total_downtime_seconds'])
                ->whereNotNull('manual_total_downtime_seconds')
                ->orderBy('id')
                ->chunkById(100, function ($characters) use ($usedDowntimeByCharacter): void {
                    foreach ($characters as $character) {
                        DB::table('characters')
                            ->where('id', $character->id)
                            ->update([
                                'manual_remaining_downtime_seconds' => max(0, (int) $character->manual_total_downtime_seconds - (int) ($usedDowntimeByCharacter[$character->id] ?? 0)),
                            ]);
                    }
                });

            Schema::table('characters', function (Blueprint $table): void {
                $table->dropColumn('manual_total_downtime_seconds');
            });
        }
    }
};
