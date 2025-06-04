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
    Schema::table('characters', function (Blueprint $table) {
      $table->enum('start_tier', ['bt', 'lt', 'ht'])->change();
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::table('characters', function (Blueprint $table) {
      $table->string('start_tier')->change();
    });
  }
};
