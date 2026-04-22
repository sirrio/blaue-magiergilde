<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('characters', function (Blueprint $table) {
            $table->unsignedInteger('bubble_shop_legacy_spend')->default(0)->after('bubble_shop_spend');
        });

        DB::table('characters')->update([
            'bubble_shop_legacy_spend' => DB::raw('bubble_shop_spend'),
        ]);

        Schema::create('character_bubble_shop_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('character_id')->constrained()->cascadeOnDelete();
            $table->string('type', 64);
            $table->unsignedInteger('quantity')->default(0);
            $table->json('details')->nullable();
            $table->timestamps();

            $table->unique(['character_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('character_bubble_shop_purchases');

        Schema::table('characters', function (Blueprint $table) {
            $table->dropColumn('bubble_shop_legacy_spend');
        });
    }
};
