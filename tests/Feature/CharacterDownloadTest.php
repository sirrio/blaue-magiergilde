<?php

use App\Models\Adventure;
use App\Models\Ally;
use App\Models\Character;
use App\Models\CharacterClass;
use App\Models\Downtime;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('character download returns json data', function () {
    $user = User::factory()->create();

    $character = Character::factory()->create([
        'user_id' => $user->id,
        'name' => 'Hero',
        'faction' => 'diplomaten',
    ]);

    $class = CharacterClass::factory()->create(['name' => 'Wizard']);
    $character->characterClasses()->attach($class);

    Ally::factory()->create(['character_id' => $character->id, 'name' => 'Ally1', 'rating' => 4]);
    Adventure::factory()->create(['character_id' => $character->id, 'title' => 'Quest']);
    Downtime::factory()->create(['character_id' => $character->id, 'type' => 'faction']);

    $response = $this->actingAs($user)->get(route('characters.download', $character));

    $response->assertOk();

    $data = json_decode($response->streamedContent(), true);

    expect($data)->toMatchArray([
        'name' => 'Hero',
        'faction' => 'diplomaten',
    ]);
    expect($data['classes'])->toContain('Wizard');
    expect($data['allies'][0]['name'])->toBe('Ally1');
});

test('character download supports pretty format', function () {
    $user = User::factory()->create();

    $character = Character::factory()->create([
        'user_id' => $user->id,
        'name' => 'Hero',
        'faction' => 'diplomaten',
    ]);

    $class = CharacterClass::factory()->create(['name' => 'Wizard']);
    $character->characterClasses()->attach($class);

    Ally::factory()->create(['character_id' => $character->id, 'name' => 'Ally1', 'rating' => 4]);
    Adventure::factory()->create(['character_id' => $character->id, 'title' => 'Quest']);
    Downtime::factory()->create(['character_id' => $character->id, 'type' => 'faction']);

    $response = $this->actingAs($user)->get(route('characters.download', [
        'character' => $character,
        'format' => 'pretty',
    ]));

    $response->assertOk();
    expect((string) $response->headers->get('content-type'))->toContain('text/markdown');

    $content = $response->streamedContent();
    expect($content)->toContain('# Character Export');
    expect($content)->toContain('Name: Hero');
    expect($content)->toContain('## Classes');
    expect($content)->toContain('- Wizard');
    expect($content)->toContain('## Allies');
    expect($content)->toContain('- Ally1');
});

test('character download is forbidden for non-owners', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $character = Character::factory()->create(['user_id' => $owner->id]);

    $response = $this->actingAs($otherUser)->get(route('characters.download', $character));

    $response->assertForbidden();
});
