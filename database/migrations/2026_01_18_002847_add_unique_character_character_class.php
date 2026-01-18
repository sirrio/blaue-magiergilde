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
        if (DB::getDriverName() === 'sqlite') {
            DB::statement(
                '
                DELETE FROM character_character_class
                WHERE id NOT IN (
                    SELECT MIN(id)
                    FROM character_character_class
                    GROUP BY character_id, character_class_id
                )
                '
            );
        } else {
            DB::statement(
                '
                DELETE ccc FROM character_character_class ccc
                INNER JOIN character_character_class duplicate
                    ON duplicate.character_id = ccc.character_id
                    AND duplicate.character_class_id = ccc.character_class_id
                    AND duplicate.id < ccc.id
                '
            );
        }

        Schema::table('character_character_class', function (Blueprint $table) {
            $table->unique(['character_id', 'character_class_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('character_character_class', function (Blueprint $table) {
            $table->dropUnique(['character_id', 'character_class_id']);
        });
    }
};
