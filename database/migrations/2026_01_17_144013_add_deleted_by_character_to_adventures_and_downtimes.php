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
        Schema::table('adventures', function (Blueprint $table) {
            $table->boolean('deleted_by_character')->default(false)->after('deleted_at');
        });
        Schema::table('downtimes', function (Blueprint $table) {
            $table->boolean('deleted_by_character')->default(false)->after('deleted_at');
        });

        $connection = DB::connection();
        $driver = $connection->getDriverName();
        $characterDeletedAtThreshold = $driver === 'sqlite'
            ? "datetime(characters.deleted_at, '-10 minutes')"
            : 'DATE_SUB(characters.deleted_at, INTERVAL 10 MINUTE)';

        DB::table('adventures')
            ->join('characters', 'adventures.character_id', '=', 'characters.id')
            ->whereNotNull('adventures.deleted_at')
            ->whereNotNull('characters.deleted_at')
            ->whereRaw("adventures.deleted_at >= {$characterDeletedAtThreshold}")
            ->update(['adventures.deleted_by_character' => true]);

        DB::table('downtimes')
            ->join('characters', 'downtimes.character_id', '=', 'characters.id')
            ->whereNotNull('downtimes.deleted_at')
            ->whereNotNull('characters.deleted_at')
            ->whereRaw("downtimes.deleted_at >= {$characterDeletedAtThreshold}")
            ->update(['downtimes.deleted_by_character' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('adventures', function (Blueprint $table) {
            $table->dropColumn('deleted_by_character');
        });
        Schema::table('downtimes', function (Blueprint $table) {
            $table->dropColumn('deleted_by_character');
        });
    }
};
