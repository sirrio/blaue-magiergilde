<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shop_roll_rules', function (Blueprint $table) {
            $table->id();
            $table->string('row_kind', 16)->default('rule');
            $table->string('rarity', 32);
            $table->json('selection_types');
            $table->string('source_kind', 32)->default('all');
            $table->string('heading_title');
            $table->unsignedInteger('count')->default(0);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['sort_order', 'id']);
        });

        DB::table('shop_roll_rules')->insert(array_map(static fn (array $rule): array => [
            ...$rule,
            'created_at' => now(),
            'updated_at' => now(),
        ], [
            ['row_kind' => 'heading', 'rarity' => 'common', 'selection_types' => json_encode(['item'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'heading_title' => 'Common Magic Items (Ab Low Tier)', 'count' => 0, 'sort_order' => 10],
            ['row_kind' => 'rule', 'rarity' => 'common', 'selection_types' => json_encode(['weapon', 'armor', 'item'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'heading_title' => '', 'count' => 5, 'sort_order' => 20],
            ['row_kind' => 'heading', 'rarity' => 'common', 'selection_types' => json_encode(['item'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'heading_title' => 'Common Consumable', 'count' => 0, 'sort_order' => 30],
            ['row_kind' => 'rule', 'rarity' => 'common', 'selection_types' => json_encode(['consumable'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'heading_title' => '', 'count' => 1, 'sort_order' => 40],
            ['row_kind' => 'heading', 'rarity' => 'common', 'selection_types' => json_encode(['item'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'heading_title' => 'Common Spell Scroll', 'count' => 0, 'sort_order' => 50],
            ['row_kind' => 'rule', 'rarity' => 'common', 'selection_types' => json_encode(['spellscroll'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'heading_title' => '', 'count' => 1, 'sort_order' => 60],
            ['row_kind' => 'heading', 'rarity' => 'common', 'selection_types' => json_encode(['item'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'heading_title' => 'Uncommon Magic Items (Ab Low Tier)', 'count' => 0, 'sort_order' => 70],
            ['row_kind' => 'rule', 'rarity' => 'uncommon', 'selection_types' => json_encode(['weapon', 'armor', 'item'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'heading_title' => '', 'count' => 3, 'sort_order' => 80],
            ['row_kind' => 'heading', 'rarity' => 'common', 'selection_types' => json_encode(['item'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'heading_title' => 'Uncommon Consumable', 'count' => 0, 'sort_order' => 90],
            ['row_kind' => 'rule', 'rarity' => 'uncommon', 'selection_types' => json_encode(['consumable'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'heading_title' => '', 'count' => 1, 'sort_order' => 100],
            ['row_kind' => 'heading', 'rarity' => 'common', 'selection_types' => json_encode(['item'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'heading_title' => 'Uncommon Spell Scroll', 'count' => 0, 'sort_order' => 110],
            ['row_kind' => 'rule', 'rarity' => 'uncommon', 'selection_types' => json_encode(['spellscroll'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'heading_title' => '', 'count' => 1, 'sort_order' => 120],
            ['row_kind' => 'heading', 'rarity' => 'common', 'selection_types' => json_encode(['item'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'heading_title' => 'Rare Magic Items (Ab High Tier)', 'count' => 0, 'sort_order' => 130],
            ['row_kind' => 'rule', 'rarity' => 'rare', 'selection_types' => json_encode(['weapon', 'armor', 'item'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'heading_title' => '', 'count' => 2, 'sort_order' => 140],
            ['row_kind' => 'heading', 'rarity' => 'common', 'selection_types' => json_encode(['item'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'heading_title' => 'Rare Consumable/Spell Scroll', 'count' => 0, 'sort_order' => 150],
            ['row_kind' => 'rule', 'rarity' => 'rare', 'selection_types' => json_encode(['consumable', 'spellscroll'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'heading_title' => '', 'count' => 1, 'sort_order' => 160],
            ['row_kind' => 'heading', 'rarity' => 'common', 'selection_types' => json_encode(['item'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'heading_title' => 'Very Rare Magic Items (Ab Epic Tier)', 'count' => 0, 'sort_order' => 170],
            ['row_kind' => 'rule', 'rarity' => 'very_rare', 'selection_types' => json_encode(['weapon', 'armor', 'item'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'heading_title' => '', 'count' => 1, 'sort_order' => 180],
            ['row_kind' => 'heading', 'rarity' => 'common', 'selection_types' => json_encode(['item'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'heading_title' => 'Very Rare Consumable/Spell Scroll', 'count' => 0, 'sort_order' => 190],
            ['row_kind' => 'rule', 'rarity' => 'very_rare', 'selection_types' => json_encode(['consumable', 'spellscroll'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'heading_title' => '', 'count' => 1, 'sort_order' => 200],
        ]));
    }

    public function down(): void
    {
        Schema::dropIfExists('shop_roll_rules');
    }
};
