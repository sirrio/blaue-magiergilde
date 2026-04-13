<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('character_classes', function (Blueprint $table) {
            $table->dropColumn('src');
        });
    }

    public function down(): void
    {
        Schema::table('character_classes', function (Blueprint $table) {
            $table->string('src')->nullable()->after('name');
        });
    }
};
