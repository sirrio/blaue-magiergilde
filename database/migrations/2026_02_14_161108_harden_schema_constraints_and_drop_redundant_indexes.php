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

        Schema::table('characters', function (Blueprint $table) {
            $table->dropIndex('characters_user_id_foreign');
            $table->dropIndex('characters_guild_status_index');
        });

        Schema::table('games', function (Blueprint $table) {
            $table->dropIndex('games_user_id_foreign');
        });

        Schema::table('adventures', function (Blueprint $table) {
            $table->dropIndex('adventures_character_id_foreign');
            $table->dropIndex('adventures_character_id_deleted_at_index');
        });

        Schema::table('downtimes', function (Blueprint $table) {
            $table->dropIndex('downtimes_character_id_foreign');
            $table->dropIndex('downtimes_character_id_deleted_at_index');
        });

        Schema::table('allies', function (Blueprint $table) {
            $table->dropIndex('allies_character_id_foreign');
            $table->dropIndex('allies_character_id_name_index');
        });

        Schema::table('character_character_class', function (Blueprint $table) {
            $table->dropIndex('character_character_class_character_id_foreign');
        });

        Schema::table('auction_bids', function (Blueprint $table) {
            $table->dropIndex('auction_bids_auction_item_id_foreign');
        });

        Schema::table('discord_channels', function (Blueprint $table) {
            $table->dropIndex('discord_channels_parent_id_index');
        });

        Schema::table('discord_messages', function (Blueprint $table) {
            $table->dropIndex('discord_messages_discord_channel_id_index');
        });

        Schema::table('room_assets', function (Blueprint $table) {
            $table->dropIndex('room_assets_room_id_foreign');
        });

        DB::statement("ALTER TABLE `characters` ADD CONSTRAINT `chk_characters_guild_status` CHECK (`guild_status` IN ('pending','approved','declined','retired','draft'))");
        DB::statement("ALTER TABLE `games` ADD CONSTRAINT `chk_games_tier` CHECK (`tier` IN ('bt','lt','ht','et'))");
        DB::statement("ALTER TABLE `games` ADD CONSTRAINT `chk_games_tier_of_month_reward` CHECK (`tier_of_month_reward` IS NULL OR `tier_of_month_reward` IN ('bubble','coin'))");
        DB::statement("ALTER TABLE `auctions` ADD CONSTRAINT `chk_auctions_status` CHECK (`status` IN ('open','closed','draft'))");
        DB::statement("ALTER TABLE `auctions` ADD CONSTRAINT `chk_auctions_currency` CHECK (`currency` = 'GP')");

        Schema::table('shop_settings', function (Blueprint $table) {
            $table->unsignedTinyInteger('singleton_guard')->default(1);
            $table->unique('singleton_guard', 'shop_settings_singleton_guard_unique');
        });

        Schema::table('auction_settings', function (Blueprint $table) {
            $table->unsignedTinyInteger('singleton_guard')->default(1);
            $table->unique('singleton_guard', 'auction_settings_singleton_guard_unique');
        });

        Schema::table('backstock_settings', function (Blueprint $table) {
            $table->unsignedTinyInteger('singleton_guard')->default(1);
            $table->unique('singleton_guard', 'backstock_settings_singleton_guard_unique');
        });

        Schema::table('discord_bot_settings', function (Blueprint $table) {
            $table->unsignedTinyInteger('singleton_guard')->default(1);
            $table->unique('singleton_guard', 'discord_bot_settings_singleton_guard_unique');
        });

        Schema::table('discord_backup_settings', function (Blueprint $table) {
            $table->unsignedTinyInteger('singleton_guard')->default(1);
            $table->unique('singleton_guard', 'discord_backup_settings_singleton_guard_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        Schema::table('shop_settings', function (Blueprint $table) {
            $table->dropUnique('shop_settings_singleton_guard_unique');
            $table->dropColumn('singleton_guard');
        });

        Schema::table('auction_settings', function (Blueprint $table) {
            $table->dropUnique('auction_settings_singleton_guard_unique');
            $table->dropColumn('singleton_guard');
        });

        Schema::table('backstock_settings', function (Blueprint $table) {
            $table->dropUnique('backstock_settings_singleton_guard_unique');
            $table->dropColumn('singleton_guard');
        });

        Schema::table('discord_bot_settings', function (Blueprint $table) {
            $table->dropUnique('discord_bot_settings_singleton_guard_unique');
            $table->dropColumn('singleton_guard');
        });

        Schema::table('discord_backup_settings', function (Blueprint $table) {
            $table->dropUnique('discord_backup_settings_singleton_guard_unique');
            $table->dropColumn('singleton_guard');
        });

        DB::statement('ALTER TABLE `characters` DROP CHECK `chk_characters_guild_status`');
        DB::statement('ALTER TABLE `games` DROP CHECK `chk_games_tier`');
        DB::statement('ALTER TABLE `games` DROP CHECK `chk_games_tier_of_month_reward`');
        DB::statement('ALTER TABLE `auctions` DROP CHECK `chk_auctions_status`');
        DB::statement('ALTER TABLE `auctions` DROP CHECK `chk_auctions_currency`');

        Schema::table('characters', function (Blueprint $table) {
            $table->index('user_id', 'characters_user_id_foreign');
            $table->index('guild_status', 'characters_guild_status_index');
        });

        Schema::table('games', function (Blueprint $table) {
            $table->index('user_id', 'games_user_id_foreign');
        });

        Schema::table('adventures', function (Blueprint $table) {
            $table->index('character_id', 'adventures_character_id_foreign');
            $table->index(['character_id', 'deleted_at'], 'adventures_character_id_deleted_at_index');
        });

        Schema::table('downtimes', function (Blueprint $table) {
            $table->index('character_id', 'downtimes_character_id_foreign');
            $table->index(['character_id', 'deleted_at'], 'downtimes_character_id_deleted_at_index');
        });

        Schema::table('allies', function (Blueprint $table) {
            $table->index('character_id', 'allies_character_id_foreign');
            $table->index(['character_id', 'name'], 'allies_character_id_name_index');
        });

        Schema::table('character_character_class', function (Blueprint $table) {
            $table->index('character_id', 'character_character_class_character_id_foreign');
        });

        Schema::table('auction_bids', function (Blueprint $table) {
            $table->index('auction_item_id', 'auction_bids_auction_item_id_foreign');
        });

        Schema::table('discord_channels', function (Blueprint $table) {
            $table->index('parent_id', 'discord_channels_parent_id_index');
        });

        Schema::table('discord_messages', function (Blueprint $table) {
            $table->index('discord_channel_id', 'discord_messages_discord_channel_id_index');
        });

        Schema::table('room_assets', function (Blueprint $table) {
            $table->index('room_id', 'room_assets_room_id_foreign');
        });
    }
};
