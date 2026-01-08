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
        Schema::create('discord_channels', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('guild_id', 32);
            $table->string('name');
            $table->string('type', 32);
            $table->string('parent_id', 32)->nullable();
            $table->boolean('is_thread')->default(false);
            $table->string('last_message_id', 32)->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            $table->index('guild_id');
            $table->index('parent_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('discord_channels');
    }
};
