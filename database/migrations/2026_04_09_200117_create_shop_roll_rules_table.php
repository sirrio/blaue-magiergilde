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
            $table->string('rarity', 32);
            $table->json('selection_types');
            $table->string('source_kind', 32)->default('all');
            $table->string('section_title');
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
            ['rarity' => 'common', 'selection_types' => json_encode(['weapon', 'armor', 'item'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'section_title' => 'Common Magic Items (Ab Low Tier)', 'count' => 5, 'sort_order' => 10],
            ['rarity' => 'common', 'selection_types' => json_encode(['consumable'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'section_title' => 'Common Consumable', 'count' => 1, 'sort_order' => 20],
            ['rarity' => 'common', 'selection_types' => json_encode(['spellscroll'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'section_title' => 'Common Spell Scroll', 'count' => 1, 'sort_order' => 30],
            ['rarity' => 'uncommon', 'selection_types' => json_encode(['weapon', 'armor', 'item'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'section_title' => 'Uncommon Magic Items (Ab Low Tier)', 'count' => 3, 'sort_order' => 40],
            ['rarity' => 'uncommon', 'selection_types' => json_encode(['consumable'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'section_title' => 'Uncommon Consumable', 'count' => 1, 'sort_order' => 50],
            ['rarity' => 'uncommon', 'selection_types' => json_encode(['spellscroll'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'section_title' => 'Uncommon Spell Scroll', 'count' => 1, 'sort_order' => 60],
            ['rarity' => 'rare', 'selection_types' => json_encode(['weapon', 'armor', 'item'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'section_title' => 'Rare Magic Items (Ab High Tier)', 'count' => 2, 'sort_order' => 70],
            ['rarity' => 'rare', 'selection_types' => json_encode(['consumable', 'spellscroll'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'section_title' => 'Rare Consumable/Spell Scroll', 'count' => 1, 'sort_order' => 80],
            ['rarity' => 'rare', 'selection_types' => json_encode(['spellscroll'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'section_title' => 'Rare Spell Scroll', 'count' => 0, 'sort_order' => 90],
            ['rarity' => 'very_rare', 'selection_types' => json_encode(['weapon', 'armor', 'item'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'section_title' => 'Very Rare Magic Items (Ab Epic Tier)', 'count' => 1, 'sort_order' => 100],
            ['rarity' => 'very_rare', 'selection_types' => json_encode(['consumable', 'spellscroll'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'section_title' => 'Very Rare Consumable/Spell Scroll', 'count' => 1, 'sort_order' => 110],
            ['rarity' => 'very_rare', 'selection_types' => json_encode(['spellscroll'], JSON_THROW_ON_ERROR), 'source_kind' => 'all', 'section_title' => 'Very Rare Spell Scroll', 'count' => 0, 'sort_order' => 120],
        ]));
    }

    public function down(): void
    {
        Schema::dropIfExists('shop_roll_rules');
    }
};
