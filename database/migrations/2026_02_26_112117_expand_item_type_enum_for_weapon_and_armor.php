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
        Schema::table('items', function (Blueprint $table): void {
            $table->enum('type', ['weapon', 'armor', 'item', 'consumable', 'spellscroll'])
                ->default('item')
                ->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('items')
            ->whereIn('type', ['weapon', 'armor'])
            ->update(['type' => 'item']);

        Schema::table('items', function (Blueprint $table): void {
            $table->enum('type', ['item', 'consumable', 'spellscroll'])
                ->default('item')
                ->change();
        });
    }
};
