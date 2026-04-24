<?php

use App\Models\CharacterAuditEvent;
use App\Models\User;
use App\Support\CharacterBubbleShop;
use App\Support\LevelProgression;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

it('backfills audit events from legacy progression data during the audit migration', function () {
    Schema::dropIfExists('character_audit_events');

    Schema::table('characters', function (Blueprint $table): void {
        $table->integer('dm_bubbles')->default(0);
        $table->integer('dm_coins')->default(0);
        $table->integer('bubble_shop_spend')->default(0);
        $table->integer('bubble_shop_legacy_spend')->nullable();
    });

    Schema::table('adventures', function (Blueprint $table): void {
        $table->boolean('is_pseudo')->default(false);
        $table->unsignedTinyInteger('target_level')->nullable();
        $table->unsignedSmallInteger('target_bubbles')->nullable();
        $table->unsignedBigInteger('progression_version_id')->nullable();
    });

    $user = User::factory()->create();
    $progressionVersionId = LevelProgression::activeVersionId();
    $anchorLevel = 5;
    $anchorAvailableBubbles = LevelProgression::bubblesRequiredForLevel($anchorLevel, $progressionVersionId) + 2;
    $now = now();

    $characterId = DB::table('characters')->insertGetId([
        'user_id' => $user->id,
        'name' => 'Legacy Backfill Test',
        'external_link' => 'https://www.dndbeyond.com/characters/90000001',
        'start_tier' => 'lt',
        'version' => '2024',
        'avatar' => null,
        'is_filler' => false,
        'faction' => 'gardisten',
        'notes' => 'Legacy source row',
        'position' => 1,
        'progression_version_id' => $progressionVersionId,
        'simplified_tracking' => true,
        'avatar_masked' => true,
        'private_mode' => false,
        'guild_status' => 'approved',
        'dm_bubbles' => 4,
        'dm_coins' => 3,
        'bubble_shop_spend' => 8,
        'bubble_shop_legacy_spend' => 8,
        'created_at' => $now->copy()->subDays(10),
        'updated_at' => $now->copy()->subDays(1),
    ]);

    DB::table('character_bubble_shop_purchases')->insert([
        [
            'character_id' => $characterId,
            'type' => CharacterBubbleShop::TYPE_SKILL_PROFICIENCY,
            'quantity' => 1,
            'details' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ],
        [
            'character_id' => $characterId,
            'type' => CharacterBubbleShop::TYPE_DOWNTIME,
            'quantity' => 2,
            'details' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ],
    ]);

    DB::table('adventures')->insert([
        [
            'character_id' => $characterId,
            'duration' => 21600,
            'game_master' => 'GM One',
            'title' => 'Legacy Adventure',
            'start_date' => $now->copy()->subDays(8)->toDateString(),
            'has_additional_bubble' => true,
            'notes' => null,
            'deleted_at' => null,
            'deleted_by_character' => false,
            'is_pseudo' => false,
            'target_level' => null,
            'target_bubbles' => null,
            'progression_version_id' => null,
            'created_at' => $now->copy()->subDays(8),
            'updated_at' => $now->copy()->subDays(8),
        ],
        [
            'character_id' => $characterId,
            'duration' => 0,
            'game_master' => 'System',
            'title' => 'Legacy Anchor',
            'start_date' => $now->copy()->subDays(2)->toDateString(),
            'has_additional_bubble' => false,
            'notes' => null,
            'deleted_at' => null,
            'deleted_by_character' => false,
            'is_pseudo' => true,
            'target_level' => $anchorLevel,
            'target_bubbles' => $anchorAvailableBubbles,
            'progression_version_id' => $progressionVersionId,
            'created_at' => $now->copy()->subDays(2),
            'updated_at' => $now->copy()->subDays(2),
        ],
    ]);

    DB::table('downtimes')->insert([
        'character_id' => $characterId,
        'duration' => 7200,
        'start_date' => $now->copy()->subDays(5)->toDateString(),
        'notes' => null,
        'type' => 'faction',
        'deleted_at' => null,
        'deleted_by_character' => false,
        'created_at' => $now->copy()->subDays(5),
        'updated_at' => $now->copy()->subDays(5),
    ]);

    /** @var \Illuminate\Database\Migrations\Migration $migration */
    $migration = require database_path('migrations/2026_04_23_085615_create_character_audit_events_table.php');
    $migration->up();

    $events = CharacterAuditEvent::query()
        ->where('character_id', $characterId)
        ->orderBy('occurred_at')
        ->orderBy('id')
        ->get();

    expect($events)->toHaveCount(7)
        ->and($events->pluck('action')->all())->toBe([
            'character.created',
            'adventure.created',
            'downtime.created',
            'dm_bubbles.updated',
            'dm_coins.updated',
            'bubble_shop.updated',
            'level.set',
        ])
        ->and($events->last()->state_after['available_bubbles'] ?? null)->toBe($anchorAvailableBubbles)
        ->and($events->last()->state_after['tracked_available_bubbles'] ?? null)->toBe(9)
        ->and($events->last()->state_after['real_adventures_count'] ?? null)->toBe(1)
        ->and($events->last()->state_after['bubble_shop_spend'] ?? null)->toBe(8)
        ->and($events->last()->state_after['bubble_shop_downtime_seconds'] ?? null)->toBe(57600)
        ->and($events->last()->state_after['downtime_logged_seconds'] ?? null)->toBe(7200)
        ->and($events->last()->state_after['has_level_anchor'] ?? null)->toBeTrue();
});

it('falls back to created timestamps when legacy tracking dates are malformed', function () {
    Schema::dropIfExists('character_audit_events');

    Schema::table('characters', function (Blueprint $table): void {
        $table->integer('dm_bubbles')->default(0);
        $table->integer('dm_coins')->default(0);
        $table->integer('bubble_shop_spend')->default(0);
        $table->integer('bubble_shop_legacy_spend')->nullable();
    });

    Schema::table('adventures', function (Blueprint $table): void {
        $table->boolean('is_pseudo')->default(false);
        $table->unsignedTinyInteger('target_level')->nullable();
        $table->unsignedSmallInteger('target_bubbles')->nullable();
        $table->unsignedBigInteger('progression_version_id')->nullable();
    });

    $user = User::factory()->create();
    $createdAt = now()->subDays(3);

    $characterId = DB::table('characters')->insertGetId([
        'user_id' => $user->id,
        'name' => 'Broken Date Character',
        'external_link' => 'https://www.dndbeyond.com/characters/90000002',
        'start_tier' => 'bt',
        'version' => '2024',
        'avatar' => null,
        'is_filler' => false,
        'faction' => 'none',
        'notes' => null,
        'position' => 1,
        'progression_version_id' => LevelProgression::activeVersionId(),
        'simplified_tracking' => false,
        'avatar_masked' => true,
        'private_mode' => false,
        'guild_status' => 'approved',
        'dm_bubbles' => 0,
        'dm_coins' => 0,
        'bubble_shop_spend' => 0,
        'bubble_shop_legacy_spend' => null,
        'created_at' => $createdAt,
        'updated_at' => $createdAt,
    ]);

    $adventureId = DB::table('adventures')->insertGetId([
        'character_id' => $characterId,
        'duration' => 10800,
        'game_master' => 'Legacy GM',
        'title' => 'Malformed Date Adventure',
        'start_date' => '4-05-12',
        'has_additional_bubble' => false,
        'notes' => null,
        'deleted_at' => null,
        'deleted_by_character' => false,
        'is_pseudo' => false,
        'target_level' => null,
        'target_bubbles' => null,
        'progression_version_id' => null,
        'created_at' => $createdAt,
        'updated_at' => $createdAt,
    ]);

    /** @var \Illuminate\Database\Migrations\Migration $migration */
    $migration = require database_path('migrations/2026_04_23_085615_create_character_audit_events_table.php');
    $migration->up();

    $event = CharacterAuditEvent::query()
        ->where('character_id', $characterId)
        ->where('action', 'adventure.created')
        ->where('subject_id', $adventureId)
        ->firstOrFail();

    expect($event->occurred_at->format('Y-m-d H:i:s'))->toBe($createdAt->format('Y-m-d H:i:s'));
});

it('places the backfilled character created anchor before imported historical progression', function () {
    Schema::dropIfExists('character_audit_events');

    Schema::table('characters', function (Blueprint $table): void {
        $table->integer('dm_bubbles')->default(0);
        $table->integer('dm_coins')->default(0);
        $table->integer('bubble_shop_spend')->default(0);
        $table->integer('bubble_shop_legacy_spend')->nullable();
    });

    Schema::table('adventures', function (Blueprint $table): void {
        $table->boolean('is_pseudo')->default(false);
        $table->unsignedTinyInteger('target_level')->nullable();
        $table->unsignedSmallInteger('target_bubbles')->nullable();
        $table->unsignedBigInteger('progression_version_id')->nullable();
    });

    $user = User::factory()->create();
    $progressionVersionId = LevelProgression::activeVersionId();
    $importedAt = now();
    $historicalAdventureAt = $importedAt->copy()->subYear();

    $characterId = DB::table('characters')->insertGetId([
        'user_id' => $user->id,
        'name' => 'Imported Later Character',
        'external_link' => 'https://www.dndbeyond.com/characters/90000003',
        'start_tier' => 'bt',
        'version' => '2024',
        'avatar' => null,
        'is_filler' => false,
        'faction' => 'none',
        'notes' => null,
        'position' => 1,
        'progression_version_id' => $progressionVersionId,
        'simplified_tracking' => false,
        'avatar_masked' => true,
        'private_mode' => false,
        'guild_status' => 'approved',
        'dm_bubbles' => 35,
        'dm_coins' => 0,
        'bubble_shop_spend' => 6,
        'bubble_shop_legacy_spend' => 6,
        'created_at' => $importedAt,
        'updated_at' => $importedAt,
    ]);

    DB::table('adventures')->insert([
        'character_id' => $characterId,
        'duration' => 64800,
        'game_master' => 'Legacy GM',
        'title' => 'Old Adventure',
        'start_date' => $historicalAdventureAt->toDateString(),
        'has_additional_bubble' => false,
        'notes' => null,
        'deleted_at' => null,
        'deleted_by_character' => false,
        'is_pseudo' => false,
        'target_level' => null,
        'target_bubbles' => null,
        'progression_version_id' => null,
        'created_at' => $historicalAdventureAt,
        'updated_at' => $historicalAdventureAt,
    ]);

    /** @var \Illuminate\Database\Migrations\Migration $migration */
    $migration = require database_path('migrations/2026_04_23_085615_create_character_audit_events_table.php');
    $migration->up();

    $events = CharacterAuditEvent::query()
        ->where('character_id', $characterId)
        ->orderBy('occurred_at')
        ->orderBy('id')
        ->get();

    expect($events->pluck('action')->all())->toBe([
        'character.created',
        'adventure.created',
        'dm_bubbles.updated',
        'bubble_shop.updated',
    ])->and($events->first()->occurred_at->lessThan($events[1]->occurred_at))->toBeTrue()
        ->and($events->last()->state_after['tracked_available_bubbles'] ?? null)->toBe(35)
        ->and($events->last()->state_after['available_bubbles'] ?? null)->toBe(35)
        ->and($events->last()->state_after['level'] ?? null)->toBe(LevelProgression::levelFromAvailableBubbles(35, $progressionVersionId));
});
