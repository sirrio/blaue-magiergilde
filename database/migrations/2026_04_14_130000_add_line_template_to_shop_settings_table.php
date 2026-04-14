<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shop_settings', function (Blueprint $table) {
            $table->text('line_template')->nullable()->after('draft_shop_id');
        });

        // Migrate any existing per-shop template to the global setting (use the most recent non-null one)
        $existing = DB::table('shops')
            ->whereNotNull('line_template')
            ->orderByDesc('created_at')
            ->value('line_template');

        if ($existing !== null) {
            DB::table('shop_settings')->update(['line_template' => $existing]);
        }
    }

    public function down(): void
    {
        Schema::table('shop_settings', function (Blueprint $table) {
            $table->dropColumn('line_template');
        });
    }
};
