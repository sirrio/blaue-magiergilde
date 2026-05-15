<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_announcements', function (Blueprint $table) {
            // Widen to fit comma-separated tier sets like "bt,lt,ht,et" (11 chars).
            $table->string('tier', 16)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('game_announcements', function (Blueprint $table) {
            $table->string('tier', 8)->nullable()->change();
        });
    }
};
