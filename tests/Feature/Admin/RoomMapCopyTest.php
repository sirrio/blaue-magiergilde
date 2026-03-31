<?php

use App\Models\Character;
use App\Models\Room;
use App\Models\RoomMap;
use App\Models\User;

it('allows admins to copy a room map without re-uploading the image', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $sourceMap = RoomMap::query()->create([
        'name' => 'Burg OG2',
        'image_path' => '/storage/room-maps/burg-og2.png',
        'grid_columns' => 38,
        'grid_rows' => 38,
    ]);

    $character = Character::factory()->create();

    Room::query()->create([
        'room_map_id' => $sourceMap->id,
        'name' => 'Nordturm',
        'grid_x' => 2,
        'grid_y' => 3,
        'grid_w' => 4,
        'grid_h' => 5,
        'character_id' => $character->id,
    ]);

    $response = $this
        ->actingAs($admin)
        ->post(route('admin.rooms.maps.copy', ['roomMap' => $sourceMap->id]), [
            'name' => 'Burg OG4',
            'grid_columns' => 40,
            'grid_rows' => 42,
        ]);

    $copiedMap = RoomMap::query()
        ->with('rooms')
        ->where('name', 'Burg OG4')
        ->first();

    expect($copiedMap)->not->toBeNull()
        ->and($copiedMap?->image_path)->toBe($sourceMap->image_path)
        ->and($copiedMap?->grid_columns)->toBe(40)
        ->and($copiedMap?->grid_rows)->toBe(42)
        ->and($copiedMap?->id)->not->toBe($sourceMap->id)
        ->and($copiedMap?->rooms)->toHaveCount(1)
        ->and($copiedMap?->rooms->first()?->name)->toBe('Nordturm')
        ->and($copiedMap?->rooms->first()?->grid_x)->toBe(2)
        ->and($copiedMap?->rooms->first()?->grid_y)->toBe(3)
        ->and($copiedMap?->rooms->first()?->grid_w)->toBe(4)
        ->and($copiedMap?->rooms->first()?->grid_h)->toBe(5)
        ->and($copiedMap?->rooms->first()?->character_id)->toBeNull();

    $response->assertRedirect(route('admin.rooms.index', ['map' => $copiedMap?->id]));
});

it('forbids non-admin users from copying a room map', function () {
    $user = User::factory()->create(['is_admin' => false]);

    $sourceMap = RoomMap::query()->create([
        'name' => 'Burg OG2',
        'image_path' => '/storage/room-maps/burg-og2.png',
        'grid_columns' => 38,
        'grid_rows' => 38,
    ]);

    $response = $this
        ->actingAs($user)
        ->post(route('admin.rooms.maps.copy', ['roomMap' => $sourceMap->id]), [
            'name' => 'Burg OG4',
            'grid_columns' => 38,
            'grid_rows' => 38,
        ]);

    $response->assertForbidden();
});
