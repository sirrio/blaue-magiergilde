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
        Schema::create('bot_operations', function (Blueprint $table) {
            $table->id();
            $table->string('action', 64);
            $table->string('status', 64)->index();
            $table->string('step', 64)->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('channel_id')->nullable();
            $table->foreignId('shop_id')->nullable()->constrained('shops')->nullOnDelete();
            $table->foreignId('result_shop_id')->nullable()->constrained('shops')->nullOnDelete();
            $table->foreignId('current_shop_id')->nullable()->constrained('shops')->nullOnDelete();
            $table->foreignId('draft_shop_id')->nullable()->constrained('shops')->nullOnDelete();
            $table->text('error')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();

            $table->index(['action', 'created_at'], 'bot_operations_action_created_at_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bot_operations');
        Schema::dropIfExists('shop_operations');
    }
};
