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
    Schema::table('allies', function (Blueprint $table) {
      $table->enum('standing', ['best', 'good', 'normal', 'bad'])->default('normal')->change();

    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::table('allies', function (Blueprint $table) {
      $table->enum('standing', ['good', 'normal', 'bad'])->default('normal')->change();

    });
  }
};
