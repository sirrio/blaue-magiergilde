<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->ensureShopRollRulesSchema();
        $this->ensureItemShopSchema();
    }

    private function ensureShopRollRulesSchema(): void
    {
        if (! Schema::hasTable('shop_roll_rules')) {
            return;
        }

        Schema::table('shop_roll_rules', function (Blueprint $table): void {
            if (! Schema::hasColumn('shop_roll_rules', 'selection_types') && Schema::hasColumn('shop_roll_rules', 'selection_type')) {
                $table->json('selection_types')->nullable()->after('rarity');
            }

            if (! Schema::hasColumn('shop_roll_rules', 'source_kind')) {
                $table->string('source_kind', 32)->nullable()->after(
                    Schema::hasColumn('shop_roll_rules', 'selection_types') ? 'selection_types' : 'rarity'
                );
            }

            if (! Schema::hasColumn('shop_roll_rules', 'section_title')) {
                $table->string('section_title')->nullable()->after('source_kind');
            }

            if (! Schema::hasColumn('shop_roll_rules', 'sort_order')) {
                $table->unsignedInteger('sort_order')->nullable()->after('count');
            }
        });

        $legacyRules = DB::table('shop_roll_rules')->get();

        foreach ($legacyRules as $rule) {
            $selectionTypes = $this->extractSelectionTypes($rule);

            $updates = [];

            if (Schema::hasColumn('shop_roll_rules', 'selection_types') && $selectionTypes !== [] && empty($rule->selection_types)) {
                $updates['selection_types'] = json_encode($selectionTypes, JSON_THROW_ON_ERROR);
            }

            if (Schema::hasColumn('shop_roll_rules', 'source_kind') && empty($rule->source_kind)) {
                $updates['source_kind'] = 'all';
            }

            if (Schema::hasColumn('shop_roll_rules', 'sort_order') && empty($rule->sort_order)) {
                $updates['sort_order'] = ((int) $rule->id) * 10;
            }

            if (Schema::hasColumn('shop_roll_rules', 'section_title') && empty($rule->section_title)) {
                $updates['section_title'] = $this->buildRuleSectionTitle(
                    (string) ($rule->rarity ?? 'common'),
                    $selectionTypes,
                    (string) ($updates['source_kind'] ?? $rule->source_kind ?? 'all'),
                );
            }

            if ($updates !== []) {
                DB::table('shop_roll_rules')
                    ->where('id', $rule->id)
                    ->update($updates);
            }
        }
    }

    private function ensureItemShopSchema(): void
    {
        if (! Schema::hasTable('item_shop')) {
            return;
        }

        Schema::table('item_shop', function (Blueprint $table): void {
            if (! Schema::hasColumn('item_shop', 'roll_source_kind')) {
                $table->string('roll_source_kind', 32)->nullable()->after('item_type');
            }

            if (! Schema::hasColumn('item_shop', 'roll_section_title')) {
                $table->string('roll_section_title')->nullable()->after(
                    Schema::hasColumn('item_shop', 'roll_source_kind') ? 'roll_source_kind' : 'item_type'
                );
            }

            if (! Schema::hasColumn('item_shop', 'roll_sort_order')) {
                $table->unsignedInteger('roll_sort_order')->nullable()->after(
                    Schema::hasColumn('item_shop', 'roll_section_title') ? 'roll_section_title' : 'item_type'
                );
            }
        });

        $legacyItems = DB::table('item_shop')
            ->select(['id', 'item_rarity', 'item_type', 'roll_source_kind', 'roll_section_title', 'roll_sort_order'])
            ->get();

        foreach ($legacyItems as $row) {
            $sourceKind = ! empty($row->roll_source_kind) ? (string) $row->roll_source_kind : 'all';
            $type = $row->item_type ? [(string) $row->item_type] : ['item'];
            $rarity = (string) ($row->item_rarity ?? 'common');

            $updates = [];

            if (empty($row->roll_source_kind)) {
                $updates['roll_source_kind'] = $sourceKind;
            }

            if (empty($row->roll_section_title)) {
                $updates['roll_section_title'] = $this->buildRuleSectionTitle($rarity, $type, $sourceKind);
            }

            if (empty($row->roll_sort_order)) {
                $updates['roll_sort_order'] = $this->legacySectionSortOrder($rarity, (string) ($type[0] ?? 'item'));
            }

            if ($updates !== []) {
                DB::table('item_shop')
                    ->where('id', $row->id)
                    ->update($updates);
            }
        }
    }

    /**
     * @return array<int, string>
     */
    private function extractSelectionTypes(object $rule): array
    {
        if (! empty($rule->selection_types)) {
            try {
                $decoded = json_decode((string) $rule->selection_types, true, 512, JSON_THROW_ON_ERROR);

                return Collection::make($decoded)
                    ->filter(fn (mixed $type): bool => is_string($type) && $type !== '')
                    ->values()
                    ->all();
            } catch (Throwable) {
                // Ignore invalid legacy payloads and fall back below.
            }
        }

        if (! empty($rule->selection_type)) {
            return [(string) $rule->selection_type];
        }

        return [];
    }

    /**
     * @param  array<int, string>  $selectionTypes
     */
    private function buildRuleSectionTitle(string $rarity, array $selectionTypes, string $sourceKind): string
    {
        $rarityLabel = $this->rarityDisplayName($rarity);
        $sourceLabel = match ($sourceKind) {
            'official' => ' WotC',
            'third_party' => ' 3rd-party',
            default => '',
        };

        $normalizedSelectionTypes = array_values(array_unique(array_filter($selectionTypes, static fn (string $type): bool => $type !== '')));
        $itemLikeTypes = ['weapon', 'armor', 'item'];
        $hasOnlyItemLike = $normalizedSelectionTypes !== [] && array_diff($normalizedSelectionTypes, $itemLikeTypes) === [];

        if ($hasOnlyItemLike) {
            $tierText = $this->tierRequirementForRarity($rarity);

            return $tierText !== ''
                ? sprintf('%s%s Magic Items (%s)', $rarityLabel, $sourceLabel, $tierText)
                : sprintf('%s%s Magic Items', $rarityLabel, $sourceLabel);
        }

        if ($normalizedSelectionTypes === ['consumable']) {
            return sprintf('%s%s Consumable', $rarityLabel, $sourceLabel);
        }

        if ($normalizedSelectionTypes === ['spellscroll']) {
            return sprintf('%s%s Spell Scroll', $rarityLabel, $sourceLabel);
        }

        if ($normalizedSelectionTypes !== [] && array_diff($normalizedSelectionTypes, ['consumable', 'spellscroll']) === []) {
            return sprintf('%s%s Consumable/Spell Scroll', $rarityLabel, $sourceLabel);
        }

        $labels = Collection::make($normalizedSelectionTypes)
            ->map(fn (string $type): string => match ($type) {
                'weapon' => 'Weapons',
                'armor' => 'Armor',
                'item' => 'Items',
                'consumable' => 'Consumables',
                'spellscroll' => 'Spell Scrolls',
                default => ucfirst($type),
            })
            ->implode('/');

        return trim(sprintf('%s%s %s', $rarityLabel, $sourceLabel, $labels !== '' ? $labels : 'Items'));
    }

    private function rarityDisplayName(string $rarity): string
    {
        return match ($rarity) {
            'unknown_rarity' => 'Unknown rarity',
            'artifact' => 'Artifact',
            'legendary' => 'Legendary',
            'very_rare' => 'Very Rare',
            'rare' => 'Rare',
            'uncommon' => 'Uncommon',
            default => 'Common',
        };
    }

    private function tierRequirementForRarity(string $rarity): string
    {
        return match ($rarity) {
            'common', 'uncommon' => 'Ab Low Tier',
            'rare' => 'Ab High Tier',
            'very_rare', 'legendary', 'artifact' => 'Ab Epic Tier',
            default => '',
        };
    }

    private function legacySectionSortOrder(string $rarity, string $type): int
    {
        $rarityBase = match ($rarity) {
            'common' => 10,
            'uncommon' => 40,
            'rare' => 70,
            'very_rare' => 100,
            'legendary' => 130,
            'artifact' => 160,
            'unknown_rarity' => 190,
            default => 900,
        };

        if (in_array($type, ['weapon', 'armor', 'item'], true)) {
            return $rarityBase;
        }

        if (in_array($type, ['consumable'], true)) {
            return $rarityBase + 10;
        }

        return $rarityBase + 20;
    }

    public function down(): void
    {
        //
    }
};
