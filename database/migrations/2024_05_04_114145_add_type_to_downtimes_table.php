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
    Schema::table('downtimes', function (Blueprint $table) {
      $table->enum('type', ['faction', 'other'])->default('other')->after('notes');
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::table('downtimes', function (Blueprint $table) {
      $table->dropColumn('type');
    });
  }
};
