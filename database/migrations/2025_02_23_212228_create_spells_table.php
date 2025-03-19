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
      Schema::create('spells', function (Blueprint $table) {
        $table->id();
        $table->timestamps();
        $table->softDeletes();
        $table->string('name');
        $table->string('url')->nullable();
        $table->string('legacy_url')->nullable();
        $table->enum('spell_school', [
          'abjuration',
          'conjuration',
          'divination',
          'enchantment',
          'evocation',
          'illusion',
          'necromancy',
          'transmutation',
        ])->nullable();
        $table->integer('spell_level')->default(0);
      });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('spells');
    }
};
