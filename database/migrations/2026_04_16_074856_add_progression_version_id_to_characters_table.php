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
        $activeVersionId = DB::table('level_progression_versions')
            ->where('is_active', true)
            ->orderByDesc('id')
            ->value('id');

        Schema::table('characters', function (Blueprint $table) {
            $table->foreignId('progression_version_id')
                ->nullable()
                ->after('simplified_tracking')
                ->constrained('level_progression_versions');
        });

        if ($activeVersionId) {
            DB::table('characters')
                ->whereNull('progression_version_id')
                ->update(['progression_version_id' => $activeVersionId]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('characters', function (Blueprint $table) {
            $table->dropConstrainedForeignId('progression_version_id');
        });
    }
};
