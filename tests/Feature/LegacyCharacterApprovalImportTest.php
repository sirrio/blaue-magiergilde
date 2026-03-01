<?php

use App\Models\LegacyCharacterApproval;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;

uses(RefreshDatabase::class);

test('admin can preview and apply legacy character approval import', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $csv = implode("\n", [
        ',,,,,,',
        'neuer Discordname,Spieler,Zimmer,BT,LT,HT,ET',
        'sirrio,David,1.13,"Liza: https://www.dndbeyond.com/characters/132337081",,,',
        'gammoth,G4mmoth,A12,,"Borin: https://www.dndbeyond.com/characters/132337082",,',
    ]);

    $preview = $this->actingAs($admin)->post(route('admin.settings.legacy-character-approvals.preview'), [
        'file' => UploadedFile::fake()->createWithContent('legacy.csv', $csv),
    ], ['Accept' => 'application/json']);

    $preview->assertOk();
    expect((int) $preview->json('summary.total_rows'))->toBe(2)
        ->and((int) $preview->json('summary.new_rows'))->toBe(2)
        ->and((int) $preview->json('summary.invalid_rows'))->toBe(0)
        ->and($preview->json('row_samples.0.payload.character_name'))->toBe('Liza')
        ->and($preview->json('row_samples.0.payload.tier'))->toBe('bt')
        ->and($preview->json('row_samples.1.payload.tier'))->toBe('lt');

    $apply = $this->actingAs($admin)->postJson(route('admin.settings.legacy-character-approvals.apply'), [
        'preview_token' => (string) $preview->json('preview_token'),
    ]);

    $apply->assertOk();
    expect(LegacyCharacterApproval::query()->count())->toBe(2);

    $this->assertDatabaseHas('legacy_character_approvals', [
        'character_name' => 'Liza',
        'tier' => 'bt',
        'dndbeyond_character_id' => 132337081,
        'discord_name' => 'sirrio',
        'player_name' => 'David',
    ]);
});

test('legacy import marks updated and unchanged rows against current imported data', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    LegacyCharacterApproval::factory()->create([
        'discord_name' => 'sirrio',
        'player_name' => 'David',
        'room' => '1.13',
        'tier' => 'bt',
        'character_name' => 'Liza',
        'external_link' => 'https://www.dndbeyond.com/characters/132337081',
        'dndbeyond_character_id' => 132337081,
        'source_row' => 3,
        'source_column' => 'bt',
    ]);

    $csv = implode("\n", [
        'neuer Discordname,Spieler,Zimmer,BT,LT,HT,ET',
        'sirrio,David,1.14,"Liza: https://www.dndbeyond.com/characters/132337081",,,',
    ]);

    $preview = $this->actingAs($admin)->post(route('admin.settings.legacy-character-approvals.preview'), [
        'file' => UploadedFile::fake()->createWithContent('legacy.csv', $csv),
    ], ['Accept' => 'application/json']);

    $preview->assertOk();
    expect((int) $preview->json('summary.updated_rows'))->toBe(1)
        ->and($preview->json('row_samples.0.changes.room.from'))->toBe('1.13')
        ->and($preview->json('row_samples.0.changes.room.to'))->toBe('1.14');

    $apply = $this->actingAs($admin)->postJson(route('admin.settings.legacy-character-approvals.apply'), [
        'preview_token' => (string) $preview->json('preview_token'),
    ]);

    $apply->assertOk();
    expect(LegacyCharacterApproval::query()->count())->toBe(1)
        ->and(LegacyCharacterApproval::query()->first()?->room)->toBe('1.14');
});

test('preview rejects duplicate dnd beyond ids in legacy import file', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $csv = implode("\n", [
        'neuer Discordname,Spieler,Zimmer,BT,LT,HT,ET',
        'sirrio,David,1.13,"Liza: https://www.dndbeyond.com/characters/132337081",,,',
        'gammoth,G4mmoth,A12,"Other: https://www.dndbeyond.com/characters/132337081",,,',
    ]);

    $preview = $this->actingAs($admin)->post(route('admin.settings.legacy-character-approvals.preview'), [
        'file' => UploadedFile::fake()->createWithContent('legacy.csv', $csv),
    ], ['Accept' => 'application/json']);

    $preview->assertOk();
    expect((int) $preview->json('summary.invalid_rows'))->toBe(1)
        ->and($preview->json('error_samples.0.message'))->toContain('Duplicate D&D Beyond character id');
});

test('legacy import preview accepts semicolon separated files', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $csv = implode("\n", [
        'neuer Discordname;Spieler;Zimmer;BT;LT;HT;ET',
        'sirrio;David;1.13;"Liza: https://www.dndbeyond.com/characters/132337081";;;;',
    ]);

    $preview = $this->actingAs($admin)->post(route('admin.settings.legacy-character-approvals.preview'), [
        'file' => UploadedFile::fake()->createWithContent('legacy.csv', $csv),
    ], ['Accept' => 'application/json']);

    $preview->assertOk();
    expect((int) $preview->json('summary.total_rows'))->toBe(1)
        ->and((int) $preview->json('summary.invalid_rows'))->toBe(0)
        ->and($preview->json('row_samples.0.payload.character_name'))->toBe('Liza');
});

test('preview includes detected headers when required legacy headers are missing', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $csv = implode("\n", [
        'foo,bar,baz',
        'a,b,c',
    ]);

    $preview = $this->actingAs($admin)->post(route('admin.settings.legacy-character-approvals.preview'), [
        'file' => UploadedFile::fake()->createWithContent('legacy.csv', $csv),
    ], ['Accept' => 'application/json']);

    $preview->assertOk();
    expect($preview->json('error_samples.0.message'))
        ->toContain('Missing required headers')
        ->toContain('Detected headers: foo, bar, baz');
});

test('non admin cannot preview legacy character approval import', function () {
    $user = User::factory()->create(['is_admin' => false]);

    $response = $this->actingAs($user)->post(route('admin.settings.legacy-character-approvals.preview'), [
        'file' => UploadedFile::fake()->createWithContent('legacy.csv', "neuer Discordname,Spieler,Zimmer,BT,LT,HT,ET\n"),
    ]);

    $response->assertForbidden();
});
