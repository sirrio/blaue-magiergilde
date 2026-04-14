<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mundane_item_variants', function (Blueprint $table) {
            $table->dropIndex('mundane_variants_category_sort_name_index');
            $table->dropColumn('sort_order');
            $table->index(['category', 'name'], 'mundane_variants_category_name_index');
        });
    }

    public function down(): void
    {
        Schema::table('mundane_item_variants', function (Blueprint $table) {
            $table->dropIndex('mundane_variants_category_name_index');
            $table->unsignedSmallInteger('sort_order')->default(0)->after('is_placeholder');
            $table->index(['category', 'sort_order', 'name'], 'mundane_variants_category_sort_name_index');
        });
    }
};
