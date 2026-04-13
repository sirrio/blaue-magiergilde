<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('adventures')
            ->where('is_pseudo', true)
            ->whereNull('deleted_at')
            ->where('duration', '!=', 0)
            ->update([
                'duration' => 0,
                'has_additional_bubble' => false,
            ]);
    }

    public function down(): void
    {
        // Duration data for pseudo-adventures is no longer meaningful —
        // target_level is the sole source of truth. No rollback needed.
    }
};
