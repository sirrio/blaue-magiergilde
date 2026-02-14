<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        $this->dropIndexIfExists('characters', 'characters_user_id_foreign');
        $this->dropIndexIfExists('characters', 'characters_guild_status_index');
        $this->dropIndexIfExists('games', 'games_user_id_foreign');
        $this->dropIndexIfExists('adventures', 'adventures_character_id_foreign');
        $this->dropIndexIfExists('adventures', 'adventures_character_id_deleted_at_index');
        $this->dropIndexIfExists('downtimes', 'downtimes_character_id_foreign');
        $this->dropIndexIfExists('downtimes', 'downtimes_character_id_deleted_at_index');
        $this->dropIndexIfExists('allies', 'allies_character_id_foreign');
        $this->dropIndexIfExists('allies', 'allies_character_id_name_index');
        $this->dropIndexIfExists('character_character_class', 'character_character_class_character_id_foreign');

        // Some environments created this as *_index, others as *_foreign.
        $this->dropIndexIfExists('auction_bids', 'auction_bids_auction_item_id_foreign');
        $this->dropIndexIfExists('auction_bids', 'auction_bids_auction_item_id_index');

        $this->dropIndexIfExists('discord_channels', 'discord_channels_parent_id_index');
        $this->dropIndexIfExists('discord_messages', 'discord_messages_discord_channel_id_index');
        $this->dropIndexIfExists('room_assets', 'room_assets_room_id_foreign');

        $this->addCheckIfMissing(
            'characters',
            'chk_characters_guild_status',
            "`guild_status` IN ('pending','approved','declined','retired','draft')"
        );
        $this->addCheckIfMissing(
            'games',
            'chk_games_tier',
            "`tier` IN ('bt','lt','ht','et')"
        );
        $this->addCheckIfMissing(
            'games',
            'chk_games_tier_of_month_reward',
            "`tier_of_month_reward` IS NULL OR `tier_of_month_reward` IN ('bubble','coin')"
        );
        $this->addCheckIfMissing(
            'auctions',
            'chk_auctions_status',
            "`status` IN ('open','closed','draft')"
        );
        $this->addCheckIfMissing(
            'auctions',
            'chk_auctions_currency',
            "`currency` = 'GP'"
        );

        $this->ensureSingletonGuard('shop_settings', 'shop_settings_singleton_guard_unique');
        $this->ensureSingletonGuard('auction_settings', 'auction_settings_singleton_guard_unique');
        $this->ensureSingletonGuard('backstock_settings', 'backstock_settings_singleton_guard_unique');
        $this->ensureSingletonGuard('discord_bot_settings', 'discord_bot_settings_singleton_guard_unique');
        $this->ensureSingletonGuard('discord_backup_settings', 'discord_backup_settings_singleton_guard_unique');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        $this->dropSingletonGuardIfExists('shop_settings', 'shop_settings_singleton_guard_unique');
        $this->dropSingletonGuardIfExists('auction_settings', 'auction_settings_singleton_guard_unique');
        $this->dropSingletonGuardIfExists('backstock_settings', 'backstock_settings_singleton_guard_unique');
        $this->dropSingletonGuardIfExists('discord_bot_settings', 'discord_bot_settings_singleton_guard_unique');
        $this->dropSingletonGuardIfExists('discord_backup_settings', 'discord_backup_settings_singleton_guard_unique');

        $this->dropCheckIfExists('characters', 'chk_characters_guild_status');
        $this->dropCheckIfExists('games', 'chk_games_tier');
        $this->dropCheckIfExists('games', 'chk_games_tier_of_month_reward');
        $this->dropCheckIfExists('auctions', 'chk_auctions_status');
        $this->dropCheckIfExists('auctions', 'chk_auctions_currency');

        $this->createIndexIfMissing('characters', 'characters_user_id_foreign', ['user_id']);
        $this->createIndexIfMissing('characters', 'characters_guild_status_index', ['guild_status']);
        $this->createIndexIfMissing('games', 'games_user_id_foreign', ['user_id']);
        $this->createIndexIfMissing('adventures', 'adventures_character_id_foreign', ['character_id']);
        $this->createIndexIfMissing('adventures', 'adventures_character_id_deleted_at_index', ['character_id', 'deleted_at']);
        $this->createIndexIfMissing('downtimes', 'downtimes_character_id_foreign', ['character_id']);
        $this->createIndexIfMissing('downtimes', 'downtimes_character_id_deleted_at_index', ['character_id', 'deleted_at']);
        $this->createIndexIfMissing('allies', 'allies_character_id_foreign', ['character_id']);
        $this->createIndexIfMissing('allies', 'allies_character_id_name_index', ['character_id', 'name']);
        $this->createIndexIfMissing('character_character_class', 'character_character_class_character_id_foreign', ['character_id']);
        $this->createIndexIfMissing('auction_bids', 'auction_bids_auction_item_id_foreign', ['auction_item_id']);
        $this->createIndexIfMissing('discord_channels', 'discord_channels_parent_id_index', ['parent_id']);
        $this->createIndexIfMissing('discord_messages', 'discord_messages_discord_channel_id_index', ['discord_channel_id']);
        $this->createIndexIfMissing('room_assets', 'room_assets_room_id_foreign', ['room_id']);
    }

    private function hasIndex(string $table, string $indexName): bool
    {
        $row = DB::selectOne(
            'SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1',
            [$table, $indexName]
        );

        return $row !== null;
    }

    private function dropIndexIfExists(string $table, string $indexName): void
    {
        if (! $this->hasIndex($table, $indexName)) {
            return;
        }

        Schema::table($table, function (Blueprint $table) use ($indexName): void {
            $table->dropIndex($indexName);
        });
    }

    /**
     * @param  array<int, string>  $columns
     */
    private function createIndexIfMissing(string $tableName, string $indexName, array $columns): void
    {
        if ($this->hasIndex($tableName, $indexName)) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($columns, $indexName): void {
            $table->index($columns, $indexName);
        });
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

    private function ensureSingletonGuard(string $table, string $uniqueIndex): void
    {
        if (! Schema::hasColumn($table, 'singleton_guard')) {
            Schema::table($table, function (Blueprint $table): void {
                $table->unsignedTinyInteger('singleton_guard')->default(1);
            });
        }

        if (! $this->hasIndex($table, $uniqueIndex)) {
            Schema::table($table, function (Blueprint $table) use ($uniqueIndex): void {
                $table->unique('singleton_guard', $uniqueIndex);
            });
        }
    }

    private function dropSingletonGuardIfExists(string $table, string $uniqueIndex): void
    {
        if ($this->hasIndex($table, $uniqueIndex)) {
            Schema::table($table, function (Blueprint $table) use ($uniqueIndex): void {
                $table->dropUnique($uniqueIndex);
            });
        }

        if (Schema::hasColumn($table, 'singleton_guard')) {
            Schema::table($table, function (Blueprint $table): void {
                $table->dropColumn('singleton_guard');
            });
        }
    }
};
