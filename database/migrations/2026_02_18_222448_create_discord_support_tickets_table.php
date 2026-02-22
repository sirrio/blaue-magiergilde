<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discord_support_tickets', function (Blueprint $table) {
            $table->id();
            $table->string('user_discord_id', 32);
            $table->string('guild_id', 32)->nullable();
            $table->string('support_channel_id', 32);
            $table->string('thread_id', 32)->unique();
            $table->string('header_message_id', 32)->nullable();
            $table->enum('status', ['open', 'pending_user', 'pending_staff', 'closed'])->default('open');
            $table->timestamp('closed_at')->nullable();
            $table->string('closed_by_discord_id', 32)->nullable();
            $table->string('assigned_to_discord_id', 32)->nullable();
            $table->timestamp('last_user_message_at')->nullable();
            $table->timestamp('last_staff_message_at')->nullable();
            $table->timestamps();

            $table->index(['user_discord_id', 'status']);
            $table->index(['status', 'updated_at']);
            $table->index(['assigned_to_discord_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discord_support_tickets');
    }
};
