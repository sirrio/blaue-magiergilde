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
        Schema::create('game_announcements', function (Blueprint $table) {
            $table->id();
            $table->string('discord_channel_id')->index();
            $table->string('discord_message_id')->unique();
            $table->string('discord_author_id')->nullable();
            $table->string('discord_author_name')->nullable();
            $table->string('title')->nullable();
            $table->text('content')->nullable();
            $table->string('tier', 8)->nullable()->index();
            $table->dateTime('starts_at')->nullable()->index();
            $table->dateTime('posted_at')->nullable()->index();
            $table->decimal('confidence', 5, 2)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('game_announcements');
    }
};
