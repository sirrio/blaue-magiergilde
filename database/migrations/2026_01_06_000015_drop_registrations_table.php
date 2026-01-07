<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::dropIfExists('registrations');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('registrations', function ($table) {
            $table->id();
            $table->timestamps();
            $table->string('character_name');
            $table->string('character_url');
            $table->string('start_tier');
            $table->string('tier');
            $table->string('discord_name');
            $table->bigInteger('discord_id')->nullable();
            $table->longText('notes')->nullable();
            $table->string('status')->default('pending');
        });
    }
};
