<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('item_shop', function (Blueprint $table): void {
            $table->string('source_shortcode', 50)->nullable()->after('roll_rule_id');
        });
    }

    public function down(): void
    {
        Schema::table('item_shop', function (Blueprint $table): void {
            $table->dropColumn('source_shortcode');
        });
    }
};
