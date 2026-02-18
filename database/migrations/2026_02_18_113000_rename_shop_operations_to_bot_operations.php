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
        if (Schema::hasTable('shop_operations') && ! Schema::hasTable('bot_operations')) {
            Schema::rename('shop_operations', 'bot_operations');
        }

        if (! Schema::hasTable('bot_operations')) {
            return;
        }

        Schema::table('bot_operations', function (Blueprint $table) {
            if (! Schema::hasColumn('bot_operations', 'resource')) {
                $table->string('resource', 32)->default('shop')->after('action')->index();
            }

            if (! Schema::hasColumn('bot_operations', 'resource_id')) {
                $table->unsignedBigInteger('resource_id')->nullable()->after('resource')->index();
            }
        });

        DB::table('bot_operations')
            ->whereNull('resource')
            ->update(['resource' => 'shop']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('bot_operations')) {
            return;
        }

        Schema::table('bot_operations', function (Blueprint $table) {
            if (Schema::hasColumn('bot_operations', 'resource_id')) {
                $table->dropColumn('resource_id');
            }

            if (Schema::hasColumn('bot_operations', 'resource')) {
                $table->dropColumn('resource');
            }
        });

        if (! Schema::hasTable('shop_operations')) {
            Schema::rename('bot_operations', 'shop_operations');
        }
    }
};
