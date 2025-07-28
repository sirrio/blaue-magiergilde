<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void
    {
        Schema::table('item_shop', function (Blueprint $table) {
            $table->foreignId('spell_id')->nullable()->constrained('spells')->nullOnDelete();
        });
    }
    public function down(): void
    {
        Schema::table('item_shop', function (Blueprint $table) {
            $table->dropConstrainedForeignId('spell_id');
        });
    }
};
