<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('sources')->upsert([
            [
                'name' => 'Forgotten Realms: Adventures in Faerûn',
                'shortcode' => 'FRAIF',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ], ['shortcode'], ['name', 'updated_at']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('sources')
            ->where('shortcode', 'FRAIF')
            ->delete();
    }
};
