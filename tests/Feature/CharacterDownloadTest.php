<?php

use App\Models\{User, Character, CharacterClass, Adventure, Downtime, Ally};
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('character download returns human readable data', function () {
    $user = User::factory()->create();

    $character = Character::factory()->create([
        'user_id' => $user->id,
        'name' => 'Hero',
        'faction' => 'diplomaten',
    ]);

    $class = CharacterClass::factory()->create(['name' => 'Wizard']);
    $character->characterClasses()->attach($class);

    Ally::factory()->create(['character_id' => $character->id, 'name' => 'Ally1', 'standing' => 'good']);
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
