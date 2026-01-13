<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('room_assets', function (Blueprint $table) {
            $table->float('scale_x')->default(1)->after('scale');
            $table->float('scale_y')->default(1)->after('scale_x');
        });

        DB::table('room_assets')->update([
            'scale_x' => DB::raw('scale'),
            'scale_y' => DB::raw('scale'),
        ]);
    }

    public function down(): void
    {
        Schema::table('room_assets', function (Blueprint $table) {
            $table->dropColumn(['scale_x', 'scale_y']);
        });
    }
};
