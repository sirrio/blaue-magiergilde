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
        Schema::table('shops', function (Blueprint $table) {
            $table->json('roll_rows_snapshot')->nullable()->after('created_at');
        });

        $snapshot = DB::table('shop_roll_rules')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'row_kind', 'rarity', 'selection_types', 'source_kind', 'heading_title', 'count', 'sort_order'])
            ->map(function (object $row): array {
                return [
                    'id' => (int) $row->id,
                    'row_kind' => (string) $row->row_kind,
                    'rarity' => (string) $row->rarity,
                    'selection_types' => json_decode((string) $row->selection_types, true) ?: [],
                    'source_kind' => (string) $row->source_kind,
                    'heading_title' => (string) $row->heading_title,
                    'count' => (int) $row->count,
                    'sort_order' => (int) $row->sort_order,
                ];
            })
            ->values()
            ->all();

        if ($snapshot !== []) {
            DB::table('shops')->update([
                'roll_rows_snapshot' => json_encode($snapshot, JSON_THROW_ON_ERROR),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->dropColumn('roll_rows_snapshot');
        });
    }
};
