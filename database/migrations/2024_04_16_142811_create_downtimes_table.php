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
    Schema::create('downtimes', function (Blueprint $table) {
      $table->id();
      $table->timestamps();
      $table->bigInteger('duration');
      $table->date('start_date');
      $table->longText('notes')->nullable();
      $table->foreignId('character_id')->constrained()->cascadeOnDelete();
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::dropIfExists('downtimes');
  }
};
