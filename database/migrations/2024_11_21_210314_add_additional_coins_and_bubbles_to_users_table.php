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
    Schema::table('users', function (Blueprint $table) {
      $table->integer('other_coins')->after('password')->default(0);
      $table->integer('other_bubbles')->after('password')->default(0);

      $table->integer('bt_coins')->after('password')->default(0);
      $table->integer('bt_bubbles')->after('password')->default(0);

      $table->integer('lt_coins')->after('password')->default(0);
      $table->integer('lt_bubbles')->after('password')->default(0);

      $table->integer('ht_coins')->after('password')->default(0);
      $table->integer('ht_bubbles')->after('password')->default(0);

      $table->integer('et_coins')->after('password')->default(0);
      $table->integer('et_bubbles')->after('password')->default(0);

      $table->integer('event_coins')->after('password')->default(0);
      $table->integer('event_bubbles')->after('password')->default(0);
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::table('users', function (Blueprint $table) {
      $table->dropColumn('event_bubbles');
      $table->dropColumn('event_coins');

      $table->dropColumn('lt_coins');
      $table->dropColumn('lt_bubbles');

      $table->dropColumn('ht_bubbles');
      $table->dropColumn('ht_coins');

      $table->dropColumn('et_coins');
      $table->dropColumn('et_bubbles');

      $table->dropColumn('bt_coins');
      $table->dropColumn('bt_bubbles');

      $table->dropColumn('other_bubbles');
      $table->dropColumn('other_coins');
    });
  }
};
