<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $officialWotcShortcodes = [
            'AI',
            'BGDIA',
            'BPGOTG',
            'CM',
            'COS',
            'COTN',
            'DMG',
            'DSDQ',
            'EGW',
            'ERFTLW',
            'FRAIF',
            'FTD',
            'GGR',
            'GOS',
            'IDROTF',
            'IMR',
            'LLK',
            'MOT',
            'OOTA',
            'PAITM',
            'PBTSO',
            'PHB',
            'POTA',
            'QFTIS',
            'SACOC',
            'SAIS',
            'SDW',
            'SKT',
            'STWTHC',
            'TBOMT',
            'TCOE',
            'TOA',
            'TOD',
            'TWBW',
            'TYP',
            'VEOR',
            'WDH',
            'WDOTMM',
            'WGE',
            'XGE',
        ];

        Schema::table('sources', function (Blueprint $table) {
            $table->string('kind', 20)->default('third_party')->after('shortcode');
        });

        DB::table('sources')->update(['kind' => 'third_party']);
        DB::table('sources')
            ->whereIn('shortcode', $officialWotcShortcodes)
            ->update(['kind' => 'official']);
    }

    public function down(): void
    {
        Schema::table('sources', function (Blueprint $table) {
            $table->dropColumn('kind');
        });
    }
};
