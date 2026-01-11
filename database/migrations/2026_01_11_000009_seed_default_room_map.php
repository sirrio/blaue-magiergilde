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
        $exists = DB::table('room_maps')
            ->where('image_path', '/images/rooms/lt_mapinnen_og.jpg')
            ->exists();

        if ($exists) {
            return;
        }

        DB::table('room_maps')->insert([
            'name' => 'Schloss OG',
            'image_path' => '/images/rooms/lt_mapinnen_og.jpg',
            'grid_columns' => 34,
            'grid_rows' => 35,
            'created_at' => now(),
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
            ->delete();
    }
};
