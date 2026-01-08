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
        Schema::create('discord_messages', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('discord_channel_id', 32);
            $table->string('guild_id', 32);
            $table->string('author_id', 32);
            $table->string('author_name');
            $table->string('author_display_name')->nullable();
            $table->text('content')->nullable();
            $table->unsignedSmallInteger('message_type')->default(0);
            $table->boolean('is_pinned')->default(false);
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('edited_at')->nullable();
            $table->json('payload')->nullable();
            $table->timestamps();

            $table->index('discord_channel_id');
            $table->index('guild_id');
            $table->index('sent_at');
            $table->foreign('discord_channel_id')
                ->references('id')
                ->on('discord_channels')
                ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('discord_messages');
    }
};
