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
    Schema::create('items', function (Blueprint $table) {
      $table->id();
      $table->timestamps();
      $table->softDeletes();
      $table->string('name');
      $table->string('url')->nullable();
      $table->string('cost')->nullable();
      $table->enum('rarity', ['common', 'uncommon', 'rare', 'very_rare'])->default('common');
      $table->enum('type', ['item', 'consumable', 'spellscroll'])->default('item');
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::dropIfExists('items');
  }
};
