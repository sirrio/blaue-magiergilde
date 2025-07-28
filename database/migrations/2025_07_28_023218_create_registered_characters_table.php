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
        Schema::create('registered_characters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('registered_player_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('tier');
            $table->string('url');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('registered_characters');
    }
};
