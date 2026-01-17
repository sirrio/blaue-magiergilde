<?php

use App\Models\Spell;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('admin can update spells', function () {
    $admin = User::factory()->create();
    $admin->forceFill(['is_admin' => true])->save();

    $spell = Spell::factory()->create();

    $payload = [
        'id' => $spell->id,
        'name' => 'Mage Shield',
        'url' => 'https://example.com/mage-shield',
        'legacy_url' => 'https://example.com/legacy-mage-shield',
        'spell_school' => 'abjuration',
        'spell_level' => 1,
        'guild_enabled' => true,
        'ruling_changed' => true,
        'ruling_note' => 'Updated ruling.',
    ];

    $response = $this->actingAs($admin)->put(route('admin.spells.update', $spell), $payload);

    $response->assertRedirect()
        ->assertSessionHasNoErrors();

    $spell->refresh();

    expect($spell->name)->toBe('Mage Shield')
        ->and($spell->url)->toBe('https://example.com/mage-shield')
        ->and($spell->legacy_url)->toBe('https://example.com/legacy-mage-shield')
        ->and($spell->spell_school)->toBe('abjuration')
        ->and($spell->spell_level)->toBe(1)
        ->and((bool) $spell->guild_enabled)->toBeTrue()
        ->and($spell->ruling_changed)->toBeTrue()
        ->and($spell->ruling_note)->toBe('Updated ruling.');
});
