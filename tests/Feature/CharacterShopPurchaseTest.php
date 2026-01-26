<?php

use App\Models\Adventure;
use App\Models\Character;
use App\Models\CharacterShopPurchase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('stores a bubble shop purchase when the character has enough bubbles', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'is_filler' => false,
    ]);

    Adventure::factory()->for($character)->create([
        'duration' => 10800 * 10,
        'has_additional_bubble' => false,
    ]);

    $this->actingAs($user)
        ->post(route('characters.shop-purchases.store', $character), [
            'type' => 'language',
        ])
        ->assertSessionHasNoErrors();

    $this->assertDatabaseHas('character_shop_purchases', [
        'character_id' => $character->id,
        'type' => 'language',
        'cost' => 2,
        'deleted_at' => null,
    ]);
});

it('blocks a second skill proficiency purchase', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'is_filler' => false,
    ]);

    Adventure::factory()->for($character)->create([
        'duration' => 10800 * 12,
        'has_additional_bubble' => false,
    ]);

    CharacterShopPurchase::query()->create([
        'character_id' => $character->id,
        'type' => 'skill_prof',
        'cost' => 6,
    ]);

    $this->actingAs($user)
        ->post(route('characters.shop-purchases.store', $character), [
            'type' => 'skill_prof',
        ])
        ->assertSessionHasErrors('type');

    $this->assertDatabaseCount('character_shop_purchases', 1);
});

it('blocks purchases when the character is below level 5', function () {
    $user = User::factory()->create();
    $character = Character::factory()->for($user)->create([
        'start_tier' => 'bt',
        'dm_bubbles' => 0,
        'bubble_shop_spend' => 0,
        'is_filler' => false,
    ]);

    $this->actingAs($user)
        ->post(route('characters.shop-purchases.store', $character), [
            'type' => 'tool',
        ])
        ->assertSessionHasErrors('type');

    $this->assertDatabaseCount('character_shop_purchases', 0);
});
