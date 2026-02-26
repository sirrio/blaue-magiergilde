<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mundane_item_variants', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->enum('category', ['weapon', 'armor']);
            $table->decimal('cost_gp', 10, 2)->nullable();
            $table->boolean('is_placeholder')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['category', 'sort_order', 'name'], 'mundane_variants_category_sort_name_index');
        });

        Schema::create('item_mundane_variant', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('mundane_item_variant_id')->constrained('mundane_item_variants')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['item_id', 'mundane_item_variant_id'], 'item_mundane_variant_unique');
            $table->index(['mundane_item_variant_id', 'item_id'], 'item_mundane_variant_lookup_index');
        });

        $this->seedMundaneVariants();
        $this->backfillLegacyVariantLinks();
    }

    public function down(): void
    {
        Schema::dropIfExists('item_mundane_variant');
        Schema::dropIfExists('mundane_item_variants');
    }

    private function seedMundaneVariants(): void
    {
        $variants = [
            ['name' => 'Any weapon price (legacy)', 'slug' => 'any-weapon-price-legacy', 'category' => 'weapon', 'cost_gp' => null, 'is_placeholder' => true],
            ['name' => 'Any armor price (legacy)', 'slug' => 'any-armor-price-legacy', 'category' => 'armor', 'cost_gp' => null, 'is_placeholder' => true],

            ['name' => 'Club', 'slug' => 'club', 'category' => 'weapon', 'cost_gp' => 0.10],
            ['name' => 'Dagger', 'slug' => 'dagger', 'category' => 'weapon', 'cost_gp' => 2.00],
            ['name' => 'Greatclub', 'slug' => 'greatclub', 'category' => 'weapon', 'cost_gp' => 0.20],
            ['name' => 'Handaxe', 'slug' => 'handaxe', 'category' => 'weapon', 'cost_gp' => 5.00],
            ['name' => 'Javelin', 'slug' => 'javelin', 'category' => 'weapon', 'cost_gp' => 0.50],
            ['name' => 'Light Hammer', 'slug' => 'light-hammer', 'category' => 'weapon', 'cost_gp' => 2.00],
            ['name' => 'Mace', 'slug' => 'mace', 'category' => 'weapon', 'cost_gp' => 5.00],
            ['name' => 'Quarterstaff', 'slug' => 'quarterstaff', 'category' => 'weapon', 'cost_gp' => 0.20],
            ['name' => 'Sickle', 'slug' => 'sickle', 'category' => 'weapon', 'cost_gp' => 1.00],
            ['name' => 'Spear', 'slug' => 'spear', 'category' => 'weapon', 'cost_gp' => 1.00],
            ['name' => 'Light Crossbow', 'slug' => 'light-crossbow', 'category' => 'weapon', 'cost_gp' => 25.00],
            ['name' => 'Dart', 'slug' => 'dart', 'category' => 'weapon', 'cost_gp' => 0.05],
            ['name' => 'Shortbow', 'slug' => 'shortbow', 'category' => 'weapon', 'cost_gp' => 25.00],
            ['name' => 'Sling', 'slug' => 'sling', 'category' => 'weapon', 'cost_gp' => 0.10],
            ['name' => 'Battleaxe', 'slug' => 'battleaxe', 'category' => 'weapon', 'cost_gp' => 10.00],
            ['name' => 'Flail', 'slug' => 'flail', 'category' => 'weapon', 'cost_gp' => 10.00],
            ['name' => 'Glaive', 'slug' => 'glaive', 'category' => 'weapon', 'cost_gp' => 20.00],
            ['name' => 'Greataxe', 'slug' => 'greataxe', 'category' => 'weapon', 'cost_gp' => 30.00],
            ['name' => 'Greatsword', 'slug' => 'greatsword', 'category' => 'weapon', 'cost_gp' => 50.00],
            ['name' => 'Halberd', 'slug' => 'halberd', 'category' => 'weapon', 'cost_gp' => 20.00],
            ['name' => 'Lance', 'slug' => 'lance', 'category' => 'weapon', 'cost_gp' => 10.00],
            ['name' => 'Longsword', 'slug' => 'longsword', 'category' => 'weapon', 'cost_gp' => 15.00],
            ['name' => 'Maul', 'slug' => 'maul', 'category' => 'weapon', 'cost_gp' => 10.00],
            ['name' => 'Morningstar', 'slug' => 'morningstar', 'category' => 'weapon', 'cost_gp' => 15.00],
            ['name' => 'Pike', 'slug' => 'pike', 'category' => 'weapon', 'cost_gp' => 5.00],
            ['name' => 'Rapier', 'slug' => 'rapier', 'category' => 'weapon', 'cost_gp' => 25.00],
            ['name' => 'Scimitar', 'slug' => 'scimitar', 'category' => 'weapon', 'cost_gp' => 25.00],
            ['name' => 'Shortsword', 'slug' => 'shortsword', 'category' => 'weapon', 'cost_gp' => 10.00],
            ['name' => 'Trident', 'slug' => 'trident', 'category' => 'weapon', 'cost_gp' => 5.00],
            ['name' => 'War Pick', 'slug' => 'war-pick', 'category' => 'weapon', 'cost_gp' => 5.00],
            ['name' => 'Warhammer', 'slug' => 'warhammer', 'category' => 'weapon', 'cost_gp' => 15.00],
            ['name' => 'Whip', 'slug' => 'whip', 'category' => 'weapon', 'cost_gp' => 2.00],
            ['name' => 'Blowgun', 'slug' => 'blowgun', 'category' => 'weapon', 'cost_gp' => 10.00],
            ['name' => 'Hand Crossbow', 'slug' => 'hand-crossbow', 'category' => 'weapon', 'cost_gp' => 75.00],
            ['name' => 'Heavy Crossbow', 'slug' => 'heavy-crossbow', 'category' => 'weapon', 'cost_gp' => 50.00],
            ['name' => 'Longbow', 'slug' => 'longbow', 'category' => 'weapon', 'cost_gp' => 50.00],
            ['name' => 'Net', 'slug' => 'net', 'category' => 'weapon', 'cost_gp' => 1.00],

            ['name' => 'Padded Armor', 'slug' => 'padded-armor', 'category' => 'armor', 'cost_gp' => 5.00],
            ['name' => 'Leather Armor', 'slug' => 'leather-armor', 'category' => 'armor', 'cost_gp' => 10.00],
            ['name' => 'Studded Leather Armor', 'slug' => 'studded-leather-armor', 'category' => 'armor', 'cost_gp' => 45.00],
            ['name' => 'Hide Armor', 'slug' => 'hide-armor', 'category' => 'armor', 'cost_gp' => 10.00],
            ['name' => 'Chain Shirt', 'slug' => 'chain-shirt', 'category' => 'armor', 'cost_gp' => 50.00],
            ['name' => 'Scale Mail', 'slug' => 'scale-mail', 'category' => 'armor', 'cost_gp' => 50.00],
            ['name' => 'Breastplate', 'slug' => 'breastplate', 'category' => 'armor', 'cost_gp' => 400.00],
            ['name' => 'Half Plate', 'slug' => 'half-plate', 'category' => 'armor', 'cost_gp' => 750.00],
            ['name' => 'Ring Mail', 'slug' => 'ring-mail', 'category' => 'armor', 'cost_gp' => 30.00],
            ['name' => 'Chain Mail', 'slug' => 'chain-mail', 'category' => 'armor', 'cost_gp' => 75.00],
            ['name' => 'Splint Armor', 'slug' => 'splint-armor', 'category' => 'armor', 'cost_gp' => 200.00],
            ['name' => 'Plate Armor', 'slug' => 'plate-armor', 'category' => 'armor', 'cost_gp' => 1500.00],
            ['name' => 'Shield', 'slug' => 'shield', 'category' => 'armor', 'cost_gp' => 10.00],
        ];

        $now = now();
        $rows = [];
        foreach ($variants as $index => $variant) {
            $rows[] = [
                'name' => $variant['name'],
                'slug' => $variant['slug'],
                'category' => $variant['category'],
                'cost_gp' => $variant['cost_gp'],
                'is_placeholder' => $variant['is_placeholder'] ?? false,
                'sort_order' => $index + 1,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('mundane_item_variants')->insert($rows);
    }

    private function backfillLegacyVariantLinks(): void
    {
        $variantIds = DB::table('mundane_item_variants')
            ->whereIn('slug', ['any-weapon-price-legacy', 'any-armor-price-legacy'])
            ->pluck('id', 'slug');

        $weaponPlaceholderId = $variantIds['any-weapon-price-legacy'] ?? null;
        $armorPlaceholderId = $variantIds['any-armor-price-legacy'] ?? null;
        if (! $weaponPlaceholderId && ! $armorPlaceholderId) {
            return;
        }

        DB::table('items')
            ->select(['id', 'cost'])
            ->orderBy('id')
            ->chunkById(500, function ($items) use ($weaponPlaceholderId, $armorPlaceholderId): void {
                $rows = [];
                $now = now();

                foreach ($items as $item) {
                    $cost = mb_strtolower((string) ($item->cost ?? ''));
                    if ($cost === '') {
                        continue;
                    }

                    if ($weaponPlaceholderId && str_contains($cost, 'waffenpreis')) {
                        $rows[] = [
                            'item_id' => $item->id,
                            'mundane_item_variant_id' => $weaponPlaceholderId,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ];
                    }

                    if ($armorPlaceholderId && (str_contains($cost, 'rüstungspreis') || str_contains($cost, 'ruestungspreis'))) {
                        $rows[] = [
                            'item_id' => $item->id,
                            'mundane_item_variant_id' => $armorPlaceholderId,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ];
                    }
                }

                if ($rows !== []) {
                    DB::table('item_mundane_variant')->insertOrIgnore($rows);
                }
            });
    }
};
