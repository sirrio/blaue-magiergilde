<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('item_shop', function (Blueprint $table) {
            $table->string('roll_source_kind', 32)->nullable()->after('item_type');
            $table->foreignId('roll_rule_id')
                ->nullable()
                ->after('roll_source_kind')
                ->constrained('shop_roll_rules')
                ->nullOnDelete();
        });

        $rules = DB::table('shop_roll_rules')
            ->select(['id', 'rarity', 'selection_types', 'source_kind'])
            ->where('row_kind', 'rule')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(static function (object $rule): array {
                $selectionTypes = json_decode((string) $rule->selection_types, true, 512, JSON_THROW_ON_ERROR);

                return [
                    'id' => (int) $rule->id,
                    'rarity' => (string) $rule->rarity,
                    'selection_types' => is_array($selectionTypes) ? array_values($selectionTypes) : [],
                    'source_kind' => (string) $rule->source_kind,
                ];
            })
            ->all();

        $shopItems = DB::table('item_shop as si')
            ->join('items as i', 'i.id', '=', 'si.item_id')
            ->leftJoin('sources as s', 's.id', '=', 'i.source_id')
            ->select([
                'si.id',
                'i.rarity',
                'i.type',
                's.kind as source_kind',
            ])
            ->get();

        foreach ($shopItems as $shopItem) {
            $itemSourceKind = in_array($shopItem->source_kind, ['official', 'third_party'], true)
                ? (string) $shopItem->source_kind
                : 'all';

            $matchedRuleId = collect($rules)
                ->first(static function (array $rule) use ($shopItem, $itemSourceKind): bool {
                    return $rule['rarity'] === (string) $shopItem->rarity
                        && in_array((string) $shopItem->type, $rule['selection_types'], true)
                        && ($rule['source_kind'] === 'all' || $rule['source_kind'] === $itemSourceKind);
                })['id'] ?? null;

            DB::table('item_shop')
                ->where('id', $shopItem->id)
                ->update([
                    'roll_source_kind' => $itemSourceKind,
                    'roll_rule_id' => $matchedRuleId,
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('item_shop', function (Blueprint $table) {
            $table->dropForeign(['roll_rule_id']);
            $table->dropColumn('roll_rule_id');
            $table->dropColumn('roll_source_kind');
        });
    }
};
