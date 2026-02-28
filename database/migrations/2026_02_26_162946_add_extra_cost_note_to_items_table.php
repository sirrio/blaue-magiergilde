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
        Schema::table('items', function (Blueprint $table) {
            $table->string('extra_cost_note')->nullable()->after('cost');
        });

        DB::table('items')
            ->select(['id', 'type', 'cost'])
            ->orderBy('id')
            ->chunkById(500, function ($items): void {
                foreach ($items as $item) {
                    if (in_array((string) $item->type, ['weapon', 'armor'], true)) {
                        continue;
                    }

                    $cost = trim((string) ($item->cost ?? ''));
                    if ($cost === '') {
                        continue;
                    }

                    if (! preg_match('/\+\s*(.+)$/u', $cost, $matches)) {
                        continue;
                    }

                    $note = trim((string) ($matches[1] ?? ''));
                    if ($note === '') {
                        continue;
                    }

                    DB::table('items')
                        ->where('id', $item->id)
                        ->whereNull('extra_cost_note')
                        ->update(['extra_cost_note' => $note]);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn('extra_cost_note');
        });
    }
};
