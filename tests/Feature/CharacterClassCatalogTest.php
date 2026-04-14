<?php

use App\Models\CharacterClass;
use Database\Seeders\CharacterClassSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('pugilist character class exists after migrations', function () {
    $class = CharacterClass::query()
        ->where('name', 'Pugilist')
        ->first();

    expect($class)->not->toBeNull();
});

test('character class seeder keeps pugilist unique', function () {
    $this->seed(CharacterClassSeeder::class);
    $this->seed(CharacterClassSeeder::class);

    expect(CharacterClass::query()->where('name', 'Pugilist')->count())->toBe(1);
});
