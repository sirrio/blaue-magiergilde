<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('sources')
            ->where('kind', 'third_party')
            ->update(['kind' => 'partnered']);

        DB::table('item_shop')
            ->where('roll_source_kind', 'third_party')
            ->update(['roll_source_kind' => 'partnered']);

        DB::table('shop_roll_rules')
            ->where('source_kind', 'third_party')
            ->update(['source_kind' => 'partnered']);
    }

    public function down(): void
    {
        DB::table('sources')
            ->where('kind', 'partnered')
            ->update(['kind' => 'third_party']);

        DB::table('item_shop')
            ->where('roll_source_kind', 'partnered')
            ->update(['roll_source_kind' => 'third_party']);

        DB::table('shop_roll_rules')
            ->where('source_kind', 'partnered')
            ->update(['source_kind' => 'third_party']);
    }
};
