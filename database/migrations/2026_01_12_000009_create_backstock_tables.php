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
        Schema::create('backstock_settings', function (Blueprint $table) {
            $table->id();
            $table->string('post_channel_id')->nullable();
            $table->string('post_channel_name')->nullable();
            $table->string('post_channel_type')->nullable();
            $table->string('post_channel_guild_id')->nullable();
            $table->boolean('post_channel_is_thread')->default(false);
            $table->string('last_post_channel_id')->nullable();
            $table->json('last_post_message_ids')->nullable();
            $table->timestamps();
        });

        Schema::create('backstock_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('items')->onDelete('cascade');
            $table->string('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('backstock_items');
        Schema::dropIfExists('backstock_settings');
    }
};
