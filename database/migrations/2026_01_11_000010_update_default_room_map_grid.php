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
        DB::table('room_maps')
            ->where('image_path', '/images/rooms/lt_mapinnen_og.jpg')
            ->update([
                'grid_columns' => 38,
                'grid_rows' => 38,
                'updated_at' => now(),
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('room_maps')
            ->where('image_path', '/images/rooms/lt_mapinnen_og.jpg')
            ->update([
                'grid_columns' => 34,
                'grid_rows' => 35,
                'updated_at' => now(),
            ]);
    }
};
