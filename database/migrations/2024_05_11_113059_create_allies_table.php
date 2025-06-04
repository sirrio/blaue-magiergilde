<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  /**
   * Run the migrations.
   */
  public function up(): void
  {
    Schema::create('allies', function (Blueprint $table) {
      $table->id();
      $table->timestamps();
      $table->string('name');
      $table->enum('standing', ['good', 'normal', 'bad'])->default('normal');
      $table->foreignId('character_id')->constrained('characters')->cascadeOnDelete();
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::dropIfExists('allies');
  }
};
