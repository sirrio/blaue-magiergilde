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
        Schema::dropIfExists('voice_settings');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('voice_settings', function (Blueprint $table) {
            $table->id();
            $table->string('voice_channel_id')->nullable();
            $table->string('voice_channel_name')->nullable();
            $table->string('voice_channel_type')->nullable();
            $table->string('voice_channel_guild_id')->nullable();
            $table->boolean('voice_channel_is_thread')->nullable();
            $table->timestamps();
        });
    }
};
