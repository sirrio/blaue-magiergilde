<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('character_classes', function (Blueprint $table) {
            $table->foreignId('source_id')->nullable()->constrained('sources')->nullOnDelete()->after('src');
            $table->boolean('guild_enabled')->default(true)->after('source_id');
        });

        Schema::create('character_subclasses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('character_class_id')->constrained('character_classes')->cascadeOnDelete();
            $table->string('name');
            $table->foreignId('source_id')->nullable()->constrained('sources')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('character_subclasses');
        Schema::table('character_classes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('source_id');
            $table->dropColumn('guild_enabled');
        });
    }
};
