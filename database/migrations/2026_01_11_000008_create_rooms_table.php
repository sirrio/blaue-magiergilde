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
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_map_id')->constrained('room_maps')->cascadeOnDelete();
            $table->string('name');
            $table->unsignedSmallInteger('grid_x');
            $table->unsignedSmallInteger('grid_y');
            $table->unsignedSmallInteger('grid_w');
            $table->unsignedSmallInteger('grid_h');
            $table->foreignId('character_id')->nullable()->constrained('characters')->nullOnDelete();
            $table->timestamps();

            $table->unique(['room_map_id', 'name']);
            $table->unique('character_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};
