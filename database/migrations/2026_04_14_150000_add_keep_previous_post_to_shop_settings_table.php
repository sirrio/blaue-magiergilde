<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shop_settings', function (Blueprint $table): void {
            $table->boolean('keep_previous_post')->default(false)->after('auto_roll_after_publish');
        });
    }

    public function down(): void
    {
        Schema::table('shop_settings', function (Blueprint $table): void {
            $table->dropColumn('keep_previous_post');
        });
    }
};
