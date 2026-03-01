<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('legacy_character_approvals', function (Blueprint $table) {
            $table->id();
            $table->string('discord_name')->nullable();
            $table->string('player_name')->nullable();
            $table->string('room')->nullable();
            $table->string('tier', 12);
            $table->string('character_name');
            $table->string('external_link');
            $table->unsignedBigInteger('dndbeyond_character_id');
            $table->unsignedInteger('source_row')->nullable();
            $table->string('source_column', 12)->nullable();
            $table->timestamps();

            $table->unique('dndbeyond_character_id');
            $table->index('tier');
            $table->index('player_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('legacy_character_approvals');
    }
};
