<?php

use Illuminate\Support\Facades\Schema;

it('creates the discord support tickets table with expected columns', function () {
    expect(Schema::hasTable('discord_support_tickets'))->toBeTrue();

    $columns = [
        'id',
        'user_discord_id',
        'guild_id',
        'support_channel_id',
        'thread_id',
        'header_message_id',
        'status',
        'closed_at',
        'closed_by_discord_id',
        'assigned_to_discord_id',
        'last_user_message_at',
        'last_staff_message_at',
        'created_at',
        'updated_at',
    ];

    foreach ($columns as $column) {
        expect(Schema::hasColumn('discord_support_tickets', $column))->toBeTrue();
    }
});
