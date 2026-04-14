<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('mundane_item_variants')) {
            return;
        }

        DB::table('mundane_item_variants')
            ->where('slug', 'any-weapon-price-legacy')
            ->update([
                'slug' => 'any-weapon',
                'name' => 'Any weapon',
            ]);

        DB::table('mundane_item_variants')
            ->where('slug', 'any-armor-price-legacy')
            ->update([
                'slug' => 'any-armor',
                'name' => 'Any armor',
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('mundane_item_variants')) {
            return;
        }

        DB::table('mundane_item_variants')
            ->where('slug', 'any-weapon')
            ->update([
                'slug' => 'any-weapon-price-legacy',
                'name' => 'Any weapon price (legacy)',
            ]);

        DB::table('mundane_item_variants')
            ->where('slug', 'any-armor')
            ->update([
                'slug' => 'any-armor-price-legacy',
                'name' => 'Any armor price (legacy)',
            ]);
    }
};
