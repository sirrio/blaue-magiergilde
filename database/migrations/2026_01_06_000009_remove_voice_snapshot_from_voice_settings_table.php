<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('voice_settings', function (Blueprint $table) {
            $table->dropColumn(['voice_candidates', 'voice_updated_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('voice_settings', function (Blueprint $table) {
            $table->json('voice_candidates')->nullable()->after('voice_channel_id');
            $table->timestamp('voice_updated_at')->nullable()->after('voice_candidates');
        });
    }
};
