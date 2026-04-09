<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('item_shop', function (Blueprint $table) {
            $table->string('roll_source_kind', 32)->nullable()->after('item_type');
            $table->string('roll_section_title')->nullable()->after('roll_source_kind');
            $table->unsignedInteger('roll_sort_order')->nullable()->after('roll_section_title');
        });
    }

    public function down(): void
    {
        Schema::table('item_shop', function (Blueprint $table) {
            $table->dropColumn('roll_sort_order');
            $table->dropColumn('roll_section_title');
            $table->dropColumn('roll_source_kind');
        });
    }
};
