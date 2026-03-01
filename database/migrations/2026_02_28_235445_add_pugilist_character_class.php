<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('character_classes')) {
            return;
        }

        DB::table('character_classes')->updateOrInsert(
            ['name' => 'Pugilist'],
            [
                'src' => '/images/no-avatar.svg',
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );
    }

    public function down(): void
    {
        if (! Schema::hasTable('character_classes')) {
            return;
        }

        DB::table('character_classes')
            ->where('name', 'Pugilist')
            ->delete();
    }
};
