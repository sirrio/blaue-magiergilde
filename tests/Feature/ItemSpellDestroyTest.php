<?php

use App\Models\Item;
use App\Models\Spell;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('admin can delete an item', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $item = Item::factory()->create();

    $response = $this->actingAs($admin)->delete(route('admin.items.destroy', $item));

    $response->assertRedirect();
    $this->assertSoftDeleted('items', ['id' => $item->id]);
});

test('admin can delete a spell', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $spell = Spell::factory()->create();

    $response = $this->actingAs($admin)->delete(route('admin.spells.destroy', $spell));

    $response->assertRedirect();
    $this->assertSoftDeleted('spells', ['id' => $spell->id]);
});
