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
        if (Schema::hasTable('discord_message_attachments')) {
            Schema::table('discord_message_attachments', function (Blueprint $table) {
                $table->unique(['discord_message_id', 'attachment_id'], 'dma_message_attachment_unique');
            });

            return;
        }

        Schema::create('discord_message_attachments', function (Blueprint $table) {
            $table->id();
            $table->string('discord_message_id', 32);
            $table->string('attachment_id', 32);
            $table->string('filename');
            $table->string('content_type')->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->string('url');
            $table->string('storage_path')->nullable();
            $table->timestamps();

            $table->unique(['discord_message_id', 'attachment_id'], 'dma_message_attachment_unique');
            $table->index('attachment_id');
            $table->foreign('discord_message_id')
                ->references('id')
                ->on('discord_messages')
                ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('discord_message_attachments');
    }
};
