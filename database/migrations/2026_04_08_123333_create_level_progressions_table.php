<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('level_progressions', function (Blueprint $table) {
            $table->id();
            $table->unsignedTinyInteger('level')->unique();
            $table->unsignedSmallInteger('required_bubbles');
            $table->timestamps();
        });

        $now = now();
        $rows = [
            ['level' => 1, 'required_bubbles' => 0],
            ['level' => 2, 'required_bubbles' => 1],
            ['level' => 3, 'required_bubbles' => 3],
            ['level' => 4, 'required_bubbles' => 6],
            ['level' => 5, 'required_bubbles' => 10],
            ['level' => 6, 'required_bubbles' => 15],
            ['level' => 7, 'required_bubbles' => 21],
            ['level' => 8, 'required_bubbles' => 28],
            ['level' => 9, 'required_bubbles' => 36],
            ['level' => 10, 'required_bubbles' => 45],
            ['level' => 11, 'required_bubbles' => 55],
            ['level' => 12, 'required_bubbles' => 66],
            ['level' => 13, 'required_bubbles' => 78],
            ['level' => 14, 'required_bubbles' => 91],
            ['level' => 15, 'required_bubbles' => 105],
            ['level' => 16, 'required_bubbles' => 120],
            ['level' => 17, 'required_bubbles' => 136],
            ['level' => 18, 'required_bubbles' => 153],
            ['level' => 19, 'required_bubbles' => 171],
            ['level' => 20, 'required_bubbles' => 190],
        ];

        DB::table('level_progressions')->insert(
            array_map(fn (array $row): array => [
                ...$row,
                'created_at' => $now,
                'updated_at' => $now,
            ], $rows),
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('level_progressions');
    }
};
