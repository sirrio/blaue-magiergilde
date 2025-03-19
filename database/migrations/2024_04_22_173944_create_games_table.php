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
    Schema::create('games', function (Blueprint $table) {
      $table->id();
      $table->timestamps();
      $table->bigInteger('duration');
      $table->date('start_date');
      $table->boolean('has_additional_bubble')->default(false);
      $table->integer('sessions')->default(1);
      $table->longText('notes')->nullable();
      $table->string('title')->nullable();
      $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::dropIfExists('games');
  }
};
