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
        Schema::table('characters', function (Blueprint $table) {
            $table->index(['user_id', 'deleted_at'], 'characters_user_id_deleted_at_index');
            $table->index(['user_id', 'name'], 'characters_user_id_name_index');
            $table->index(['guild_status', 'deleted_at', 'name', 'id'], 'characters_status_deleted_name_id_index');
        });

        Schema::table('games', function (Blueprint $table) {
            $table->index(['user_id', 'start_date'], 'games_user_id_start_date_index');
        });

        Schema::table('adventures', function (Blueprint $table) {
            $table->index(['character_id', 'deleted_at', 'start_date', 'id'], 'adventures_character_deleted_start_id_index');
        });

        Schema::table('downtimes', function (Blueprint $table) {
            $table->index(['character_id', 'deleted_at', 'start_date', 'id'], 'downtimes_character_deleted_start_id_index');
        });

        Schema::table('allies', function (Blueprint $table) {
            $table->index(['character_id', 'name', 'id'], 'allies_character_name_id_index');
        });

        Schema::table('discord_channels', function (Blueprint $table) {
            $table->index(['parent_id', 'is_thread', 'type', 'name'], 'discord_channels_parent_thread_type_name_index');
        });

        Schema::table('discord_messages', function (Blueprint $table) {
            $table->index(['discord_channel_id', 'sent_at', 'id'], 'discord_messages_channel_sent_id_index');
        });

        Schema::table('discord_message_attachments', function (Blueprint $table) {
            $table->index(['discord_message_id', 'id'], 'dma_message_id_id_index');
        });

        Schema::table('room_assets', function (Blueprint $table) {
            $table->index(['room_id', 'z_index'], 'room_assets_room_id_z_index_index');
        });

        Schema::table('items', function (Blueprint $table) {
            $table->index(['rarity', 'type', 'name'], 'items_rarity_type_name_index');
            $table->index(['shop_enabled', 'rarity', 'type', 'name'], 'items_shop_rarity_type_name_index');
            $table->index(['guild_enabled', 'rarity', 'type', 'name'], 'items_guild_rarity_type_name_index');
        });

        Schema::table('spells', function (Blueprint $table) {
            $table->index(['spell_level', 'name'], 'spells_level_name_index');
            $table->index(['spell_school', 'spell_level', 'name'], 'spells_school_level_name_index');
            $table->index(['guild_enabled', 'spell_level', 'name'], 'spells_guild_level_name_index');
        });

        Schema::table('shops', function (Blueprint $table) {
            $table->index(['created_at'], 'shops_created_at_index');
        });

        Schema::table('auctions', function (Blueprint $table) {
            $table->index(['created_at'], 'auctions_created_at_index');
        });

        Schema::table('auction_bids', function (Blueprint $table) {
            $table->index(['auction_item_id', 'amount', 'created_at'], 'auction_bids_item_amount_created_at_index');
        });

        Schema::table('auction_hidden_bids', function (Blueprint $table) {
            $table->index(['auction_item_id', 'created_at'], 'auction_hidden_bids_item_created_at_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('characters', function (Blueprint $table) {
            $table->dropIndex('characters_user_id_deleted_at_index');
            $table->dropIndex('characters_user_id_name_index');
            $table->dropIndex('characters_status_deleted_name_id_index');
        });

        Schema::table('games', function (Blueprint $table) {
            $table->dropIndex('games_user_id_start_date_index');
        });

        Schema::table('adventures', function (Blueprint $table) {
            $table->dropIndex('adventures_character_deleted_start_id_index');
        });

        Schema::table('downtimes', function (Blueprint $table) {
            $table->dropIndex('downtimes_character_deleted_start_id_index');
        });

        Schema::table('allies', function (Blueprint $table) {
            $table->dropIndex('allies_character_name_id_index');
        });

        Schema::table('discord_channels', function (Blueprint $table) {
            $table->dropIndex('discord_channels_parent_thread_type_name_index');
        });

        Schema::table('discord_messages', function (Blueprint $table) {
            $table->dropIndex('discord_messages_channel_sent_id_index');
        });

        Schema::table('discord_message_attachments', function (Blueprint $table) {
            $table->dropIndex('dma_message_id_id_index');
        });

        Schema::table('room_assets', function (Blueprint $table) {
            $table->dropIndex('room_assets_room_id_z_index_index');
        });

        Schema::table('items', function (Blueprint $table) {
            $table->dropIndex('items_rarity_type_name_index');
            $table->dropIndex('items_shop_rarity_type_name_index');
            $table->dropIndex('items_guild_rarity_type_name_index');
        });

        Schema::table('spells', function (Blueprint $table) {
            $table->dropIndex('spells_level_name_index');
            $table->dropIndex('spells_school_level_name_index');
            $table->dropIndex('spells_guild_level_name_index');
        });

        Schema::table('shops', function (Blueprint $table) {
            $table->dropIndex('shops_created_at_index');
        });

        Schema::table('auctions', function (Blueprint $table) {
            $table->dropIndex('auctions_created_at_index');
        });

        Schema::table('auction_bids', function (Blueprint $table) {
            $table->dropIndex('auction_bids_item_amount_created_at_index');
        });

        Schema::table('auction_hidden_bids', function (Blueprint $table) {
            $table->dropIndex('auction_hidden_bids_item_created_at_index');
        });
    }
};
