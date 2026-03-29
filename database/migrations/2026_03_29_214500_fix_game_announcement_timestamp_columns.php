<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if (! in_array($driver, ['mysql', 'mariadb'], true)) {
            return;
        }

        $this->ensureDateTimeColumn('game_announcements', 'created_at');
        $this->ensureDateTimeColumn('game_announcements', 'updated_at');
    }

    public function down(): void
    {
        //
    }

    private function ensureDateTimeColumn(string $table, string $column): void
    {
        $metadata = DB::selectOne(
            'SELECT data_type, is_nullable
             FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?
             LIMIT 1',
            [$table, $column],
        );

        if (! $metadata) {
            return;
        }

        $dataType = strtolower((string) ($metadata->data_type ?? ''));
        $isNullable = strtoupper((string) ($metadata->is_nullable ?? 'NO')) === 'YES';

        if (in_array($dataType, ['datetime', 'timestamp'], true) && $isNullable) {
            return;
        }

        DB::statement(sprintf(
            'ALTER TABLE `%s` MODIFY `%s` DATETIME NULL',
            $table,
            $column,
        ));
    }
};
