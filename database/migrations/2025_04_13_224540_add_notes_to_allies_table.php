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
      $table->string('avatar')->nullable()->after('name');
      $table->text('notes')->nullable()->after('avatar');
      $table->string('species')->nullable()->after('notes');
      $table->string('classes')->nullable()->after('species');
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::table('allies', function (Blueprint $table) {
      $table->dropColumn(['avatar', 'notes', 'species', 'classes']);
    });
  }
};
