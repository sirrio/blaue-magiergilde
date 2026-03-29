<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('simplified_tracking')->nullable()->default(null)->change();
        });

        DB::table('users')->update([
            'simplified_tracking' => null,
        ]);
    }

    public function down(): void
    {
        DB::table('users')
            ->whereNull('simplified_tracking')
            ->update([
                'simplified_tracking' => false,
            ]);

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('simplified_tracking')->default(false)->nullable(false)->change();
        });
    }
};
