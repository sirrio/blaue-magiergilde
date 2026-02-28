<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->normalizeTable('item_shop');
        $this->normalizeTable('auction_items');
        $this->normalizeTable('backstock_items');
    }

    public function down(): void
    {
        // Intentionally irreversible normalization migration.
    }

    private function normalizeTable(string $table): void
    {
        if (! Schema::hasTable($table)) {
            return;
        }

        DB::table($table)
            ->select(['id', 'item_cost'])
            ->whereNotNull('item_cost')
            ->where(function ($query) {
                $query->where('item_cost', 'like', '%Weapon base:%')
                    ->orWhere('item_cost', 'like', '%Armor base:%');
            })
            ->orderBy('id')
            ->chunkById(100, function ($rows) use ($table): void {
                foreach ($rows as $row) {
                    $normalized = $this->normalizeCostLabel((string) $row->item_cost, 'Weapon');
                    $normalized = $this->normalizeCostLabel($normalized, 'Armor');
                    $normalized = preg_replace('/\s+/', ' ', (string) $normalized);
                    $normalized = trim((string) $normalized);

                    if ($normalized === (string) $row->item_cost) {
                        continue;
                    }

                    DB::table($table)
                        ->where('id', $row->id)
                        ->update(['item_cost' => $normalized]);
                }
            });
    }

    private function normalizeCostLabel(string $value, string $label): string
    {
        return preg_replace_callback(
            '/'.$label.' base:\s*([^+|]+)/u',
            static function (array $matches) use ($label): string {
                $segment = trim((string) ($matches[1] ?? ''));

                if (preg_match('/\(([0-9]+(?:\.[0-9]+)?)\s*GP\)/u', $segment, $costMatch) === 1) {
                    return $label.' cost ('.trim((string) $costMatch[1]).' GP)';
                }

                return $label.' cost';
            },
            $value,
        ) ?? $value;
    }
};
