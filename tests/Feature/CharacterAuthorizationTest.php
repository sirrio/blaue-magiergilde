<?php

use App\Models\Character;
use App\Models\CharacterClass;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('users cannot update characters they do not own', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $character = Character::factory()->create(['user_id' => $owner->id]);
    $class = CharacterClass::factory()->create();

    $response = $this->actingAs($otherUser)->patch(route('characters.update', $character), [
        'name' => 'Intruder Update',
        'class' => [$class->id],
        'external_link' => 'https://www.dndbeyond.com/characters/7654321',
        'version' => '2024',
        'dm_bubbles' => 1,
        'dm_coins' => 1,
        'is_filler' => false,
        'bubble_shop_spend' => 1,
        'faction' => 'none',
        'notes' => 'Attempted change.',
    ]);

    $response->assertForbidden();
});

test('users cannot reorder characters they do not own', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $character = Character::factory()->create(['user_id' => $owner->id]);

    $response = $this->actingAs($otherUser)->post(route('characters.sort'), [
        'list' => [
            ['id' => $character->id],
        ],
    ]);

    $response->assertForbidden();
});
