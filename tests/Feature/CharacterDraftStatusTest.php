<?php

use App\Models\Character;
use App\Models\CharacterClass;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;

uses(RefreshDatabase::class);

it('allows owners to create draft characters', function () {
    $user = User::factory()->create();
    $class = CharacterClass::factory()->create();

    $this->actingAs($user)
        ->post(route('characters.store'), [
            'name' => 'Draft Mage',
            'class' => [$class->id],
            'external_link' => 'https://www.dndbeyond.com/characters/100001',
            'start_tier' => 'bt',
            'version' => '2024',
            'dm_bubbles' => 0,
            'dm_coins' => 0,
            'bubble_shop_spend' => 0,
            'is_filler' => false,
            'faction' => 'none',
            'notes' => null,
        ])
        ->assertRedirect(route('characters.index'));

    $this->assertDatabaseHas('characters', [
        'user_id' => $user->id,
        'name' => 'Draft Mage',
        'guild_status' => 'draft',
    ]);
});

it('applies the account tracking default to newly created characters', function () {
    $user = User::factory()->create([
        'simplified_tracking' => true,
    ]);
    $class = CharacterClass::factory()->create();

    $this->actingAs($user)
        ->post(route('characters.store'), [
            'name' => 'Level Default Mage',
            'class' => [$class->id],
            'external_link' => 'https://www.dndbeyond.com/characters/100099',
            'start_tier' => 'bt',
            'version' => '2024',
            'dm_bubbles' => 0,
            'dm_coins' => 0,
            'bubble_shop_spend' => 0,
            'is_filler' => false,
            'faction' => 'none',
            'notes' => null,
        ])
        ->assertRedirect(route('characters.index'));

    $this->assertDatabaseHas('characters', [
        'user_id' => $user->id,
        'name' => 'Level Default Mage',
        'simplified_tracking' => true,
    ]);
});

it('rejects epic tier as start tier', function () {
    $user = User::factory()->create();
    $class = CharacterClass::factory()->create();

    $this->actingAs($user)
        ->post(route('characters.store'), [
            'name' => 'Invalid Start Tier',
            'class' => [$class->id],
            'external_link' => 'https://www.dndbeyond.com/characters/100002',
            'start_tier' => 'et',
            'version' => '2024',
            'dm_bubbles' => 0,
            'dm_coins' => 0,
            'bubble_shop_spend' => 0,
            'is_filler' => false,
            'faction' => 'none',
            'notes' => null,
        ])
        ->assertSessionHasErrors('start_tier');
});

it('rejects dashboard URLs as external link on character create', function () {
    $user = User::factory()->create();
    $class = CharacterClass::factory()->create();

    Config::set('app.url', 'https://blaue-magiergilde.test');

    $this->actingAs($user)
        ->post(route('characters.store'), [
            'name' => 'Invalid External Link',
            'class' => [$class->id],
            'external_link' => 'https://blaue-magiergilde.test/characters',
            'start_tier' => 'bt',
            'version' => '2024',
            'dm_bubbles' => 0,
            'dm_coins' => 0,
            'bubble_shop_spend' => 0,
            'is_filler' => false,
            'faction' => 'none',
            'notes' => null,
        ])
        ->assertSessionHasErrors('external_link');
});

it('rejects non dndbeyond URLs as external link on character create', function () {
    $user = User::factory()->create();
    $class = CharacterClass::factory()->create();

    $this->actingAs($user)
        ->post(route('characters.store'), [
            'name' => 'Invalid External Link',
            'class' => [$class->id],
            'external_link' => 'https://example.com/characters/test-hero',
            'start_tier' => 'bt',
            'version' => '2024',
            'dm_bubbles' => 0,
            'dm_coins' => 0,
            'bubble_shop_spend' => 0,
            'is_filler' => false,
            'faction' => 'none',
            'notes' => null,
        ])
        ->assertSessionHasErrors('external_link');
});

it('rejects dashboard URLs as external link on character update', function () {
    $user = User::factory()->create();
    $class = CharacterClass::factory()->create();
    $character = Character::factory()->for($user)->create([
        'is_filler' => false,
        'external_link' => 'https://www.dndbeyond.com/characters/123456',
    ]);

    Config::set('app.url', 'https://blaue-magiergilde.test');

    $this->actingAs($user)
        ->put(route('characters.update', $character), [
            'name' => $character->name,
            'class' => [$class->id],
            'external_link' => 'https://blaue-magiergilde.test/characters',
            'version' => $character->version,
            'dm_bubbles' => $character->dm_bubbles,
            'dm_coins' => $character->dm_coins,
            'bubble_shop_spend' => $character->bubble_shop_spend,
            'is_filler' => $character->is_filler,
            'faction' => $character->faction,
            'notes' => $character->notes,
        ])
        ->assertSessionHasErrors('external_link');
});

it('forces draft on create even when owners submit pending directly', function () {
    Config::set('features.character_status_switch', true);

    $user = User::factory()->create();
    $class = CharacterClass::factory()->create();

    $this->actingAs($user)
        ->post(route('characters.store'), [
            'name' => 'Forced Draft While Enabled',
            'class' => [$class->id],
            'external_link' => 'https://www.dndbeyond.com/characters/100003',
            'start_tier' => 'bt',
            'version' => '2024',
            'dm_bubbles' => 0,
            'dm_coins' => 0,
            'bubble_shop_spend' => 0,
            'is_filler' => false,
            'faction' => 'none',
            'notes' => null,
            'guild_status' => 'pending',
        ])
        ->assertRedirect(route('characters.index'));

    $this->assertDatabaseHas('characters', [
        'user_id' => $user->id,
        'name' => 'Forced Draft While Enabled',
        'guild_status' => 'draft',
    ]);
});

it('forces draft on create when character status switching is disabled', function () {
    Config::set('features.character_status_switch', false);

    $user = User::factory()->create();
    $class = CharacterClass::factory()->create();

    $this->actingAs($user)
        ->post(route('characters.store'), [
            'name' => 'Forced Draft Mage',
            'class' => [$class->id],
            'external_link' => 'https://www.dndbeyond.com/characters/100004',
            'start_tier' => 'bt',
            'version' => '2024',
            'dm_bubbles' => 0,
            'dm_coins' => 0,
            'bubble_shop_spend' => 0,
            'is_filler' => false,
            'faction' => 'none',
            'notes' => null,
            'guild_status' => 'pending',
        ])
        ->assertRedirect(route('characters.index'));

    $this->assertDatabaseHas('characters', [
        'user_id' => $user->id,
        'name' => 'Forced Draft Mage',
        'guild_status' => 'draft',
    ]);
});

it('preserves existing status on update when character status switching is disabled', function () {
    Config::set('features.character_status_switch', false);

    $user = User::factory()->create();
    $class = CharacterClass::factory()->create();
    $character = Character::factory()->for($user)->create([
        'guild_status' => 'pending',
        'is_filler' => false,
    ]);

    $this->actingAs($user)
        ->put(route('characters.update', $character), [
            'name' => $character->name,
            'class' => [$class->id],
            'external_link' => $character->external_link,
            'version' => $character->version,
            'dm_bubbles' => $character->dm_bubbles,
            'dm_coins' => $character->dm_coins,
            'bubble_shop_spend' => $character->bubble_shop_spend,
            'is_filler' => $character->is_filler,
            'faction' => $character->faction,
            'notes' => $character->notes,
        ])
        ->assertRedirect(route('characters.index'));

    $character->refresh();
    expect($character->guild_status)->toBe('pending');
});

it('prevents admins from approving draft characters', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $character = Character::factory()->create(['guild_status' => 'draft']);

    $this->actingAs($admin)
        ->patch('/admin/character-approvals/characters/'.$character->id, [
            'guild_status' => 'approved',
        ])
        ->assertSessionHasErrors('guild_status');

    $character->refresh();
    expect($character->guild_status)->toBe('draft');
});

it('allows owners to register draft characters with Magiergilde for review', function () {
    Config::set('features.character_status_switch', true);

    $owner = User::factory()->create();
    $character = Character::factory()->for($owner)->create([
        'guild_status' => 'draft',
    ]);

    $this->actingAs($owner)
        ->post(route('characters.submit-approval', $character), [
            'registration_note' => 'Character concept and review notes.',
        ])
        ->assertRedirect();

    $character->refresh();
    expect($character->guild_status)->toBe('pending')
        ->and($character->registration_note)->toBe('Character concept and review notes.');
});

it('allows owners to re-register characters in needs changes status', function () {
    Config::set('features.character_status_switch', true);

    $owner = User::factory()->create();
    $character = Character::factory()->for($owner)->create([
        'guild_status' => 'needs_changes',
        'registration_note' => 'Old note',
        'review_note' => 'Old requested changes',
    ]);

    $this->actingAs($owner)
        ->post(route('characters.submit-approval', $character), [
            'registration_note' => 'Updated info after requested fixes.',
        ])
        ->assertRedirect();

    $character->refresh();
    expect($character->guild_status)->toBe('pending')
        ->and($character->registration_note)->toBe('Updated info after requested fixes.')
        ->and($character->review_note)->toBeNull();
});

it('allows empty registration info when submitting a character for review', function () {
    Config::set('features.character_status_switch', true);

    $owner = User::factory()->create();
    $character = Character::factory()->for($owner)->create([
        'guild_status' => 'draft',
    ]);

    $this->actingAs($owner)
        ->post(route('characters.submit-approval', $character), [
            'registration_note' => '',
        ])
        ->assertRedirect();

    $character->refresh();
    expect($character->guild_status)->toBe('pending')
        ->and($character->registration_note)->toBeNull();
});

it('does not allow draft submission when character status switching is disabled', function () {
    Config::set('features.character_status_switch', false);

    $owner = User::factory()->create();
    $character = Character::factory()->for($owner)->create([
        'guild_status' => 'draft',
    ]);

    $this->actingAs($owner)
        ->post(route('characters.submit-approval', $character), [
            'registration_note' => 'Attempt while feature disabled.',
        ])
        ->assertSessionHasErrors('guild_status');

    $character->refresh();
    expect($character->guild_status)->toBe('draft');
});

it('blocks submission when the user already has eight active characters', function () {
    Config::set('features.character_status_switch', true);

    $owner = User::factory()->create();
    Character::factory()->count(8)->for($owner)->create([
        'guild_status' => 'approved',
        'is_filler' => false,
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
    ]);

    $character = Character::factory()->for($owner)->create([
        'guild_status' => 'draft',
        'is_filler' => false,
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
    ]);

    $this->actingAs($owner)
        ->post(route('characters.submit-approval', $character), [
            'registration_note' => 'Attempting to register character nine.',
        ])
        ->assertSessionHasErrors('guild_status');

    $character->refresh();
    expect($character->guild_status)->toBe('draft');
});

it('allows submitting a first high-tier character beyond eight occupied general slots', function () {
    Config::set('features.character_status_switch', true);

    $owner = User::factory()->create();
    Character::factory()->count(8)->for($owner)->create([
        'guild_status' => 'approved',
        'is_filler' => false,
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
    ]);

    $character = Character::factory()->for($owner)->create([
        'guild_status' => 'draft',
        'is_filler' => false,
        'start_tier' => 'ht',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
    ]);

    $this->actingAs($owner)
        ->post(route('characters.submit-approval', $character), [
            'registration_note' => 'First high-tier bonus slot.',
        ])
        ->assertRedirect();

    $character->refresh();
    expect($character->guild_status)->toBe('pending');
});

it('allows submitting a second high-tier character beyond eight occupied general slots', function () {
    Config::set('features.character_status_switch', true);

    $owner = User::factory()->create();
    Character::factory()->count(8)->for($owner)->create([
        'guild_status' => 'approved',
        'is_filler' => false,
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
    ]);
    Character::factory()->for($owner)->create([
        'guild_status' => 'pending',
        'is_filler' => false,
        'start_tier' => 'ht',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
    ]);

    $character = Character::factory()->for($owner)->create([
        'guild_status' => 'draft',
        'is_filler' => false,
        'start_tier' => 'ht',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
    ]);

    $this->actingAs($owner)
        ->post(route('characters.submit-approval', $character), [
            'registration_note' => 'Second high-tier bonus slot.',
        ])
        ->assertRedirect();

    $character->refresh();
    expect($character->guild_status)->toBe('pending');
});

it('blocks submitting a third high-tier character when eight general slots are already occupied', function () {
    Config::set('features.character_status_switch', true);

    $owner = User::factory()->create();
    Character::factory()->count(8)->for($owner)->create([
        'guild_status' => 'approved',
        'is_filler' => false,
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
    ]);
    Character::factory()->count(2)->for($owner)->create([
        'guild_status' => 'approved',
        'is_filler' => false,
        'start_tier' => 'ht',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
    ]);

    $character = Character::factory()->for($owner)->create([
        'guild_status' => 'draft',
        'is_filler' => false,
        'start_tier' => 'ht',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
    ]);

    $this->actingAs($owner)
        ->post(route('characters.submit-approval', $character), [
            'registration_note' => 'Third high-tier should consume a general slot.',
        ])
        ->assertSessionHasErrors('guild_status');

    $character->refresh();
    expect($character->guild_status)->toBe('draft');
});

it('allows filler character submission even when the user already has eight active characters', function () {
    Config::set('features.character_status_switch', true);

    $owner = User::factory()->create();
    Character::factory()->count(8)->for($owner)->create([
        'guild_status' => 'approved',
        'is_filler' => false,
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
    ]);

    $character = Character::factory()->for($owner)->create([
        'guild_status' => 'draft',
        'is_filler' => true,
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
    ]);

    $this->actingAs($owner)
        ->post(route('characters.submit-approval', $character), [
            'registration_note' => 'Filler registration is still allowed.',
        ])
        ->assertRedirect();

    $character->refresh();
    expect($character->guild_status)->toBe('pending');
});

it('counts pending characters against the active character submission limit', function () {
    Config::set('features.character_status_switch', true);

    $owner = User::factory()->create();
    Character::factory()->count(7)->for($owner)->create([
        'guild_status' => 'approved',
        'is_filler' => false,
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
    ]);
    Character::factory()->for($owner)->create([
        'guild_status' => 'pending',
        'is_filler' => false,
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
    ]);

    $character = Character::factory()->for($owner)->create([
        'guild_status' => 'draft',
        'is_filler' => false,
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
    ]);

    $this->actingAs($owner)
        ->post(route('characters.submit-approval', $character), [
            'registration_note' => 'Attempting to register after eight approved or pending characters.',
        ])
        ->assertSessionHasErrors('guild_status');

    $character->refresh();
    expect($character->guild_status)->toBe('draft');
});

it('blocks submission of a second filler character when one filler is already approved or pending', function () {
    Config::set('features.character_status_switch', true);

    $owner = User::factory()->create();
    Character::factory()->for($owner)->create([
        'guild_status' => 'approved',
        'is_filler' => true,
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
    ]);

    $character = Character::factory()->for($owner)->create([
        'guild_status' => 'draft',
        'is_filler' => true,
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
    ]);

    $this->actingAs($owner)
        ->post(route('characters.submit-approval', $character), [
            'registration_note' => 'Attempting to register a second filler.',
        ])
        ->assertSessionHasErrors('guild_status');

    $character->refresh();
    expect($character->guild_status)->toBe('draft');
});

it('ignores direct status changes from owners on update', function () {
    Config::set('features.character_status_switch', true);

    $owner = User::factory()->create();
    $class = CharacterClass::factory()->create();
    $character = Character::factory()->for($owner)->create([
        'guild_status' => 'approved',
        'is_filler' => false,
    ]);

    $this->actingAs($owner)
        ->put(route('characters.update', $character), [
            'name' => $character->name,
            'class' => [$class->id],
            'external_link' => $character->external_link,
            'version' => $character->version,
            'dm_bubbles' => $character->dm_bubbles,
            'dm_coins' => $character->dm_coins,
            'bubble_shop_spend' => $character->bubble_shop_spend,
            'is_filler' => $character->is_filler,
            'faction' => $character->faction,
            'notes' => $character->notes,
            'guild_status' => 'draft',
        ])
        ->assertRedirect(route('characters.index'));

    $character->refresh();
    expect($character->guild_status)->toBe('approved');
});
