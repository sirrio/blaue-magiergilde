<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('mundane_item_variants') || ! Schema::hasTable('item_mundane_variant')) {
            return;
        }

        DB::table('mundane_item_variants')
            ->where('slug', 'any-weapon-price-legacy')
            ->update(['name' => 'Any weapon']);

        DB::table('mundane_item_variants')
            ->where('slug', 'any-armor-price-legacy')
            ->update(['name' => 'Any armor']);

        $placeholders = DB::table('mundane_item_variants')
            ->whereIn('slug', ['any-weapon-price-legacy', 'any-armor-price-legacy'])
            ->get(['id', 'category'])
            ->mapWithKeys(static fn ($variant): array => [(string) $variant->category => (int) $variant->id]);

        if ($placeholders->isEmpty()) {
            return;
        }

        $variantsByCategory = DB::table('mundane_item_variants')
            ->select(['id', 'category'])
            ->get()
            ->groupBy('category')
            ->map(static fn (Collection $variants): array => $variants->pluck('id')->map(static fn ($id): int => (int) $id)->all());

        foreach ($placeholders as $category => $placeholderId) {
            $categoryVariantIds = collect($variantsByCategory->get($category, []))
                ->map(static fn ($id): int => (int) $id)
                ->filter(static fn ($id): bool => $id !== $placeholderId)
                ->values()
                ->all();

            if ($categoryVariantIds === []) {
                continue;
            }

            DB::table('item_mundane_variant')
                ->where('mundane_item_variant_id', $placeholderId)
                ->orderBy('item_id')
                ->pluck('item_id')
                ->map(static fn ($id): int => (int) $id)
                ->chunk(500)
                ->each(function (Collection $itemIds) use ($categoryVariantIds): void {
                    DB::table('item_mundane_variant')
                        ->whereIn('item_id', $itemIds->all())
                        ->whereIn('mundane_item_variant_id', $categoryVariantIds)
                        ->delete();
                });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('mundane_item_variants')) {
            return;
        }

        DB::table('mundane_item_variants')
            ->where('slug', 'any-weapon-price-legacy')
            ->update(['name' => 'Any weapon price (legacy)']);

        DB::table('mundane_item_variants')
            ->where('slug', 'any-armor-price-legacy')
            ->update(['name' => 'Any armor price (legacy)']);
    }
};
