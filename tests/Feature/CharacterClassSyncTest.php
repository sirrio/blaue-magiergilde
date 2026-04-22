<?php

use App\Models\Character;
use App\Models\CharacterClass;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('character class selections are stored without duplicates on create', function () {
    $user = User::factory()->create();
    $class = CharacterClass::factory()->create();

    $response = $this->actingAs($user)->post(route('characters.store'), [
        'name' => 'Test Hero',
        'class' => [$class->id, $class->id],
        'external_link' => 'https://www.dndbeyond.com/characters/1234567',
        'start_tier' => 'bt',
        'version' => '2024',
        'dm_bubbles' => 1,
        'dm_coins' => 1,
        'is_filler' => false,
        'bubble_shop_spend' => 1,
        'faction' => 'none',
        'notes' => 'Testing duplicate class input.',
    ]);

    $response->assertRedirect(route('characters.index'));

    $character = Character::query()->firstOrFail();

    expect($character->characterClasses()->count())->toBe(1);
});

test('character class selections are synced without duplicates on update', function () {
    $user = User::factory()->create();
    $character = Character::factory()->create(['user_id' => $user->id]);
    $firstClass = CharacterClass::factory()->create();
    $secondClass = CharacterClass::factory()->create();

    $response = $this->actingAs($user)->patch(route('characters.update', $character), [
        'name' => $character->name,
        'class' => [$firstClass->id, $secondClass->id, $firstClass->id],
        'external_link' => $character->external_link,
        'version' => $character->version,
        'dm_bubbles' => $character->dm_bubbles,
        'dm_coins' => $character->dm_coins,
        'is_filler' => $character->is_filler,
        'bubble_shop_spend' => $character->bubble_shop_spend,
        'faction' => $character->faction,
        'notes' => $character->notes,
    ]);

    $response->assertRedirect(route('characters.index'));

    $character->refresh();

    $classIds = $character->characterClasses()
        ->pluck('character_classes.id')
        ->sort()
        ->values()
        ->all();

    expect($classIds)->toBe([min($firstClass->id, $secondClass->id), max($firstClass->id, $secondClass->id)]);
});

test('disabled guild classes cannot be selected on create', function () {
    $user = User::factory()->create();
    $disabledClass = CharacterClass::factory()->create([
        'guild_enabled' => false,
    ]);

    $response = $this->actingAs($user)->post(route('characters.store'), [
        'name' => 'Test Hero',
        'class' => [$disabledClass->id],
        'external_link' => 'https://www.dndbeyond.com/characters/1234567',
        'start_tier' => 'bt',
        'version' => '2024',
        'dm_bubbles' => 1,
        'dm_coins' => 1,
        'is_filler' => false,
        'bubble_shop_spend' => 0,
        'faction' => 'none',
        'notes' => 'Testing disabled class input.',
    ]);

    $response->assertSessionHasErrors('class');

    expect(Character::query()->count())->toBe(0);
});

test('disabled guild classes cannot be newly added on update', function () {
    $user = User::factory()->create();
    $character = Character::factory()->create(['user_id' => $user->id]);
    $enabledClass = CharacterClass::factory()->create([
        'guild_enabled' => true,
    ]);
    $disabledClass = CharacterClass::factory()->create([
        'guild_enabled' => false,
    ]);
    $character->characterClasses()->sync([$enabledClass->id]);

    $response = $this->actingAs($user)->patch(route('characters.update', $character), [
        'name' => $character->name,
        'class' => [$enabledClass->id, $disabledClass->id],
        'external_link' => $character->external_link,
        'version' => $character->version,
        'dm_bubbles' => $character->dm_bubbles,
        'dm_coins' => $character->dm_coins,
        'is_filler' => $character->is_filler,
        'bubble_shop_spend' => $character->bubble_shop_spend,
        'faction' => $character->faction,
        'notes' => $character->notes,
    ]);

    $response->assertSessionHasErrors('class');

    expect($character->fresh()->characterClasses()->pluck('character_classes.id')->all())
        ->toBe([$enabledClass->id]);
});

test('existing disabled guild classes can remain selected on update', function () {
    $user = User::factory()->create();
    $character = Character::factory()->create(['user_id' => $user->id]);
    $disabledClass = CharacterClass::factory()->create([
        'guild_enabled' => false,
    ]);
    $character->characterClasses()->sync([$disabledClass->id]);

    $response = $this->actingAs($user)->patch(route('characters.update', $character), [
        'name' => $character->name,
        'class' => [$disabledClass->id],
        'external_link' => $character->external_link,
        'version' => $character->version,
        'dm_bubbles' => $character->dm_bubbles,
        'dm_coins' => $character->dm_coins,
        'is_filler' => $character->is_filler,
        'bubble_shop_spend' => $character->bubble_shop_spend,
        'faction' => $character->faction,
        'notes' => $character->notes,
    ]);

    $response->assertRedirect(route('characters.index'));

    expect($character->fresh()->characterClasses()->pluck('character_classes.id')->all())
        ->toBe([$disabledClass->id]);
});
