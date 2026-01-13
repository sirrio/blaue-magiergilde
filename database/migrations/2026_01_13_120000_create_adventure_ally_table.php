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
        Schema::create('adventure_ally', function (Blueprint $table) {
            $table->foreignId('adventure_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ally_id')->constrained()->cascadeOnDelete();
            $table->unique(['adventure_id', 'ally_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('adventure_ally');
    }
};
