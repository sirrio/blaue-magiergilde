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
        Schema::create('compendium_suggestions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 16);
            $table->unsignedBigInteger('target_id');
            $table->string('status', 16)->default('pending');
            $table->json('proposed_payload')->nullable();
            $table->json('current_snapshot')->nullable();
            $table->text('notes')->nullable();
            $table->string('source_url')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->timestamps();

            $table->index(['kind', 'target_id', 'status'], 'compendium_suggestions_kind_target_status_index');
            $table->index(['status', 'created_at'], 'compendium_suggestions_status_created_at_index');
            $table->index(['user_id', 'status'], 'compendium_suggestions_user_status_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('compendium_suggestions');
    }
};
