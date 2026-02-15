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
        if (! Schema::hasColumn('characters', 'simplified_tracking')) {
            Schema::table('characters', function (Blueprint $table): void {
                $table->boolean('simplified_tracking')->default(false);
            });
        }

        if (! Schema::hasColumn('users', 'simplified_tracking')) {
            return;
        }

        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement('
                UPDATE `characters` c
                INNER JOIN `users` u ON u.`id` = c.`user_id`
                SET c.`simplified_tracking` = COALESCE(u.`simplified_tracking`, 0)
            ');

            return;
        }

        DB::table('characters')
            ->select(['id', 'user_id'])
            ->orderBy('id')
            ->chunkById(500, function ($characters): void {
                $userIds = $characters
                    ->pluck('user_id')
                    ->filter()
                    ->unique()
                    ->values()
                    ->all();

                $userTrackingModes = DB::table('users')
                    ->whereIn('id', $userIds)
                    ->pluck('simplified_tracking', 'id');

                foreach ($characters as $character) {
                    DB::table('characters')
                        ->where('id', $character->id)
                        ->update([
                            'simplified_tracking' => (bool) ($userTrackingModes[$character->user_id] ?? false),
                        ]);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('characters', 'simplified_tracking')) {
            Schema::table('characters', function (Blueprint $table): void {
                $table->dropColumn('simplified_tracking');
            });
        }
    }
};
