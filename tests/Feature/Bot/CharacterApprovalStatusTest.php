<?php

use App\Models\Character;
use App\Models\CharacterAuditEvent;
use App\Models\User;
use App\Services\CharacterApprovalNotificationService;
use Illuminate\Support\Facades\Config;

use function Pest\Laravel\mock;

it('accepts character approval actions from the discord bot', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'token');

    expect(config('services.bot.http_url'))->toBe('http://bot.test');
    expect(config('services.bot.http_token'))->toBe('token');

    $admin = User::factory()->create([
        'is_admin' => true,
        'discord_id' => '1234567890',
    ]);

    $notificationService = mock(CharacterApprovalNotificationService::class);
    $notificationService->shouldReceive('syncAnnouncement')->once()->andReturn(['ok' => true, 'status' => 200]);
    $notificationService
        ->shouldReceive('notifyStatusChange')
        ->once()
        ->withArgs(function ($characterArg, $statusArg, $contextArg) use ($admin) {
            return $characterArg instanceof Character
                && $statusArg === 'approved'
                && is_array($contextArg)
                && ($contextArg['reviewer_name'] ?? null) === $admin->name
                && (string) ($contextArg['reviewer_discord_id'] ?? '') === (string) $admin->discord_id;
        })
        ->andReturn(['ok' => true, 'status' => 200]);

    $character = Character::factory()->create([
        'guild_status' => 'pending',
    ]);
    $character->approval_discord_channel_id = '555555';
    $character->approval_discord_message_id = '666666';
    $character->save();
    $character->refresh();
    expect($character->approval_discord_channel_id)->toBe('555555');
    expect($character->approval_discord_message_id)->toBe('666666');

    $this->withHeader('X-Bot-Token', 'token')
        ->post(route('bot.character-approvals.status'), [
            'character_id' => $character->id,
            'status' => 'approved',
            'actor_discord_id' => $admin->discord_id,
        ])
        ->assertOk()
        ->assertJson(['status' => 'updated']);

    $character->refresh();
    expect($character->guild_status)->toBe('approved');

    $auditEvent = CharacterAuditEvent::query()
        ->where('character_id', $character->id)
        ->where('action', 'character.guild_status_updated')
        ->first();

    expect($auditEvent)->not->toBeNull()
        ->and($auditEvent?->actor_user_id)->toBe($admin->id)
        ->and($auditEvent?->metadata)->toMatchArray([
            'field' => 'guild_status',
            'via' => 'discord-bot',
        ])
        ->and($auditEvent?->state_after['guild_status'] ?? null)->toBe('approved');

    $notificationService->shouldHaveReceived('syncAnnouncement')->once();
    $notificationService->shouldHaveReceived('notifyStatusChange')->once();
});

it('accepts needs changes status from the discord bot', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'token');

    $admin = User::factory()->create([
        'is_admin' => true,
        'discord_id' => '2234567890',
    ]);

    $notificationService = mock(CharacterApprovalNotificationService::class);
    $notificationService->shouldReceive('syncAnnouncement')->once()->andReturn(['ok' => true, 'status' => 200]);
    $notificationService
        ->shouldReceive('notifyStatusChange')
        ->once()
        ->withArgs(function ($characterArg, $statusArg, $contextArg) use ($admin) {
            return $characterArg instanceof Character
                && $statusArg === 'needs_changes'
                && is_array($contextArg)
                && ($contextArg['reviewer_name'] ?? null) === $admin->name
                && (string) ($contextArg['reviewer_discord_id'] ?? '') === (string) $admin->discord_id;
        })
        ->andReturn(['ok' => true, 'status' => 200]);

    $character = Character::factory()->create([
        'guild_status' => 'pending',
    ]);

    $this->withHeader('X-Bot-Token', 'token')
        ->post(route('bot.character-approvals.status'), [
            'character_id' => $character->id,
            'status' => 'needs_changes',
            'actor_discord_id' => $admin->discord_id,
            'review_note' => 'Please update your external link and notes.',
        ])
        ->assertOk()
        ->assertJson(['status' => 'updated']);

    $character->refresh();
    expect($character->guild_status)->toBe('needs_changes')
        ->and($character->review_note)->toBe('Please update your external link and notes.');

    $events = CharacterAuditEvent::query()
        ->where('character_id', $character->id)
        ->whereIn('action', ['character.guild_status_updated', 'character.review_note_updated'])
        ->orderBy('id')
        ->get();

    expect($events->pluck('action')->all())->toBe([
        'character.guild_status_updated',
        'character.review_note_updated',
    ])
        ->and($events->last()?->state_after['review_note'] ?? null)->toBe('Please update your external link and notes.');

    $notificationService->shouldHaveReceived('syncAnnouncement')->once();
    $notificationService->shouldHaveReceived('notifyStatusChange')->once();
});

it('requires review note for needs changes status from the discord bot', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'token');

    $admin = User::factory()->create([
        'is_admin' => true,
        'discord_id' => '3234567890',
    ]);

    $character = Character::factory()->create([
        'guild_status' => 'pending',
    ]);

    $this->withHeader('X-Bot-Token', 'token')
        ->postJson(route('bot.character-approvals.status'), [
            'character_id' => $character->id,
            'status' => 'needs_changes',
            'actor_discord_id' => $admin->discord_id,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('review_note');
});

it('allows setting a reviewed character back to pending from the discord bot', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'token');

    $notificationService = mock(CharacterApprovalNotificationService::class);
    $notificationService->shouldReceive('syncAnnouncement')->once()->andReturn(['ok' => true, 'status' => 200]);
    $notificationService->shouldReceive('notifyStatusChange')->never();

    $admin = User::factory()->create([
        'is_admin' => true,
        'discord_id' => '4234567890',
    ]);

    $character = Character::factory()->create([
        'guild_status' => 'needs_changes',
        'review_note' => 'Old review note.',
    ]);

    $this->withHeader('X-Bot-Token', 'token')
        ->post(route('bot.character-approvals.status'), [
            'character_id' => $character->id,
            'status' => 'pending',
            'actor_discord_id' => $admin->discord_id,
        ])
        ->assertOk()
        ->assertJson(['status' => 'updated']);

    $character->refresh();
    expect($character->guild_status)->toBe('pending')
        ->and($character->review_note)->toBeNull();
});

it('requires pending status before approval decisions from the discord bot', function () {
    Config::set('services.bot.http_url', 'http://bot.test');
    Config::set('services.bot.http_token', 'token');

    $admin = User::factory()->create([
        'is_admin' => true,
        'discord_id' => '5234567890',
    ]);

    $character = Character::factory()->create([
        'guild_status' => 'needs_changes',
    ]);

    $this->withHeader('X-Bot-Token', 'token')
        ->post(route('bot.character-approvals.status'), [
            'character_id' => $character->id,
            'status' => 'approved',
            'actor_discord_id' => $admin->discord_id,
        ])
        ->assertConflict()
        ->assertJsonPath('error', 'Only pending characters can be reviewed. Move the character back to pending first.');
});
