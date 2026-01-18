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
        Schema::table('characters', function (Blueprint $table) {
            $table->unsignedTinyInteger('manual_level')->nullable()->after('bubble_shop_spend');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('simplified_tracking')->default(false)->after('avatar');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('characters', function (Blueprint $table) {
            $table->dropColumn('manual_level');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('simplified_tracking');
        });
    }
};
