<?php

use App\Models\Character;
use App\Models\CharacterAuditEvent;
use App\Models\CharacterClass;
use App\Models\User;
use App\Support\CharacterAuditTrail;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('does not record a character audit event for no-op saves', function () {
    $user = User::factory()->create();
    $class = CharacterClass::factory()->create();
    $character = Character::factory()->for($user)->create();
    app(CharacterAuditTrail::class)->record($character, 'dm_bubbles.granted', delta: ['bubbles' => 1, 'dm_bubbles' => 1]);
    app(CharacterAuditTrail::class)->record($character, 'dm_coins.granted', delta: ['dm_coins' => 2]);
    $character->characterClasses()->sync([$class->id]);

    $countBefore = CharacterAuditEvent::query()->where('character_id', $character->id)->count();

    $this->actingAs($user)->patch(route('characters.update', $character), [
        'name' => $character->name,
        'class' => [$class->id],
        'external_link' => $character->external_link,
        'version' => $character->version,
        'dm_bubbles' => 1,
        'dm_coins' => 2,
        'is_filler' => $character->is_filler,
        'bubble_shop_spend' => 0,
        'faction' => $character->faction,
        'notes' => $character->notes,
    ])->assertRedirect(route('characters.index'));

    $countAfter = CharacterAuditEvent::query()->where('character_id', $character->id)->count();

    expect($countAfter - $countBefore)->toBe(0);
});
