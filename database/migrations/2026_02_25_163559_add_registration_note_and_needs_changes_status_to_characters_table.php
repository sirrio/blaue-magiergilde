<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('characters', 'registration_note')) {
            Schema::table('characters', function (Blueprint $table) {
                $table->text('registration_note')->nullable()->after('notes');
            });
        }

        if (! in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        $this->dropCheckIfExists('characters', 'chk_characters_guild_status');
        $this->addCheckIfMissing(
            'characters',
            'chk_characters_guild_status',
            "`guild_status` IN ('pending','approved','declined','needs_changes','retired','draft')"
        );
    }

    public function down(): void
    {
        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            $this->dropCheckIfExists('characters', 'chk_characters_guild_status');
            $this->addCheckIfMissing(
                'characters',
                'chk_characters_guild_status',
                "`guild_status` IN ('pending','approved','declined','retired','draft')"
            );
        }

        if (Schema::hasColumn('characters', 'registration_note')) {
            Schema::table('characters', function (Blueprint $table) {
                $table->dropColumn('registration_note');
            });
        }
    }

    private function hasCheckConstraint(string $constraintName): bool
    {
        $row = DB::selectOne(
            'SELECT 1 FROM information_schema.check_constraints WHERE constraint_schema = DATABASE() AND constraint_name = ? LIMIT 1',
            [$constraintName]
        );

        return $row !== null;
    }

    private function addCheckIfMissing(string $table, string $constraintName, string $clause): void
    {
        if ($this->hasCheckConstraint($constraintName)) {
            return;
        }

        DB::statement("ALTER TABLE `{$table}` ADD CONSTRAINT `{$constraintName}` CHECK ({$clause})");
    }

    private function dropCheckIfExists(string $table, string $constraintName): void
    {
        if (! $this->hasCheckConstraint($constraintName)) {
            return;
        }

        DB::statement("ALTER TABLE `{$table}` DROP CHECK `{$constraintName}`");
    }
};
