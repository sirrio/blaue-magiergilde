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
        Schema::table('shop_settings', function (Blueprint $table) {
            $table->boolean('auto_post_enabled')->default(false)->after('last_post_message_ids');
            $table->unsignedTinyInteger('auto_post_weekday')->default(0)->after('auto_post_enabled');
            $table->string('auto_post_time', 5)->default('09:00')->after('auto_post_weekday');
            $table->timestamp('last_auto_posted_at')->nullable()->after('auto_post_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shop_settings', function (Blueprint $table) {
            $table->dropColumn([
                'auto_post_enabled',
                'auto_post_weekday',
                'auto_post_time',
                'last_auto_posted_at',
            ]);
        });
    }
};
