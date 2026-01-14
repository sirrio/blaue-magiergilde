<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('allies', function (Blueprint $table) {
            $table->unsignedTinyInteger('rating')->default(3)->after('standing');
            $table->foreignId('linked_character_id')
                ->nullable()
                ->after('character_id')
                ->constrained('characters')
                ->nullOnDelete();
        });

        DB::table('allies')
            ->where('standing', 'best')
            ->update(['rating' => 5]);
        DB::table('allies')
            ->where('standing', 'good')
            ->update(['rating' => 4]);
        DB::table('allies')
            ->where('standing', 'normal')
            ->update(['rating' => 3]);
        DB::table('allies')
            ->where('standing', 'bad')
            ->update(['rating' => 2]);

        Schema::table('allies', function (Blueprint $table) {
            $table->dropColumn('standing');
            $table->unique(['character_id', 'linked_character_id']);
        });
    }

    public function down(): void
    {
        Schema::table('allies', function (Blueprint $table) {
            $table->enum('standing', ['best', 'good', 'normal', 'bad'])->default('normal')->after('name');
        });

        DB::table('allies')->update(['standing' => 'normal']);
        DB::table('allies')
            ->where('rating', '>=', 5)
            ->update(['standing' => 'best']);
        DB::table('allies')
            ->where('rating', 4)
            ->update(['standing' => 'good']);
        DB::table('allies')
            ->where('rating', '<=', 2)
            ->update(['standing' => 'bad']);

        Schema::table('allies', function (Blueprint $table) {
            $table->dropUnique(['character_id', 'linked_character_id']);
            $table->dropConstrainedForeignId('linked_character_id');
            $table->dropColumn('rating');
        });
    }
};
