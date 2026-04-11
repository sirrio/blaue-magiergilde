<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('item_shop', function (Blueprint $table): void {
            $table->boolean('item_ruling_changed')->default(false)->after('item_type');
            $table->text('item_ruling_note')->nullable()->after('item_ruling_changed');
            $table->boolean('spell_ruling_changed')->default(false)->after('spell_school');
            $table->text('spell_ruling_note')->nullable()->after('spell_ruling_changed');
        });

        DB::table('item_shop')
            ->orderBy('id')
            ->chunkById(200, function ($rows): void {
                $itemIds = collect($rows)->pluck('item_id')->filter()->map(fn ($id) => (int) $id)->unique()->values();
                $spellIds = collect($rows)->pluck('spell_id')->filter()->map(fn ($id) => (int) $id)->unique()->values();

                $itemsById = $itemIds->isEmpty()
                    ? collect()
                    : DB::table('items')
                        ->whereIn('id', $itemIds)
                        ->get(['id', 'ruling_changed', 'ruling_note'])
                        ->keyBy('id');

                $spellsById = $spellIds->isEmpty()
                    ? collect()
                    : DB::table('spells')
                        ->whereIn('id', $spellIds)
                        ->get(['id', 'ruling_changed', 'ruling_note'])
                        ->keyBy('id');

                foreach ($rows as $row) {
                    $item = $row->item_id ? $itemsById->get((int) $row->item_id) : null;
                    $spell = $row->spell_id ? $spellsById->get((int) $row->spell_id) : null;

                    DB::table('item_shop')
                        ->where('id', $row->id)
                        ->update([
                            'item_ruling_changed' => (bool) ($item->ruling_changed ?? false),
                            'item_ruling_note' => $item->ruling_note ?? null,
                            'spell_ruling_changed' => (bool) ($spell->ruling_changed ?? false),
                            'spell_ruling_note' => $spell->ruling_note ?? null,
                        ]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('item_shop', function (Blueprint $table): void {
            $table->dropColumn([
                'item_ruling_changed',
                'item_ruling_note',
                'spell_ruling_changed',
                'spell_ruling_note',
            ]);
        });
    }
};
