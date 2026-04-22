<?php

use App\Models\CharacterClass;
use App\Models\CompendiumComment;
use App\Models\Item;
use App\Models\MundaneItemVariant;
use App\Models\Spell;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('authenticated users can access compendium item and spell pages', function () {
    $user = User::factory()->create(['is_admin' => false]);

    $this->actingAs($user)
        ->get(route('compendium.items.index'))
        ->assertOk();

    $this->actingAs($user)
        ->get(route('compendium.spells.index'))
        ->assertOk();

    $this->actingAs($user)
        ->get(route('compendium.character-classes.index'))
        ->assertOk();

    $this->actingAs($user)
        ->get(route('compendium.mundane-item-variants.index'))
        ->assertOk();
});

test('admins can manage compendium pages from the shared routes', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->get(route('compendium.items.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('canManage', true)
            ->where('indexRoute', 'compendium.items.index'));

    $this->actingAs($admin)
        ->get(route('compendium.spells.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('canManage', true)
            ->where('indexRoute', 'compendium.spells.index'));

    $this->actingAs($admin)
        ->get(route('compendium.character-classes.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('canManage', true)
            ->where('indexRoute', 'compendium.character-classes.index'));

    $this->actingAs($admin)
        ->get(route('compendium.mundane-item-variants.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('canManage', true)
            ->where('indexRoute', 'compendium.mundane-item-variants.index'));
});

test('authenticated users can add comments to item and spell compendium entries', function () {
    $user = User::factory()->create(['is_admin' => false]);
    $item = Item::factory()->create();
    $spell = Spell::factory()->create();

    $this->actingAs($user)
        ->post(route('compendium.items.comments.store', $item), [
            'body' => 'Bitte den Text im Compendium prüfen.',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->actingAs($user)
        ->post(route('compendium.spells.comments.store', $spell), [
            'body' => 'Die Legacy-URL passt noch nicht.',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $itemComment = CompendiumComment::query()->whereMorphedTo('commentable', $item)->latest('id')->first();
    $spellComment = CompendiumComment::query()->whereMorphedTo('commentable', $spell)->latest('id')->first();

    expect($itemComment)->not->toBeNull()
        ->and($itemComment?->user_id)->toBe($user->id)
        ->and($itemComment?->body)->toBe('Bitte den Text im Compendium prüfen.');

    expect($spellComment)->not->toBeNull()
        ->and($spellComment?->user_id)->toBe($user->id)
        ->and($spellComment?->body)->toBe('Die Legacy-URL passt noch nicht.');
});

test('authenticated users can add comments to class and variant compendium entries', function () {
    $user = User::factory()->create(['is_admin' => false]);
    $characterClass = CharacterClass::query()->create([
        'name' => 'Swordmage',
        'guild_enabled' => true,
    ]);
    $variant = MundaneItemVariant::query()->create([
        'name' => 'Longsword',
        'slug' => 'longsword-comment-check',
        'category' => 'weapon',
        'cost_gp' => 15,
        'is_placeholder' => false,
        'guild_enabled' => true,
    ]);

    $this->actingAs($user)
        ->post(route('compendium.character-classes.comments.store', $characterClass), [
            'body' => 'Bitte die Klassenbeschreibung prüfen.',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->actingAs($user)
        ->post(route('compendium.mundane-item-variants.comments.store', $variant), [
            'body' => 'Die Kosten sollten noch geprüft werden.',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $classComment = CompendiumComment::query()->whereMorphedTo('commentable', $characterClass)->latest('id')->first();
    $variantComment = CompendiumComment::query()->whereMorphedTo('commentable', $variant)->latest('id')->first();

    expect($classComment)->not->toBeNull()
        ->and($classComment?->user_id)->toBe($user->id)
        ->and($classComment?->body)->toBe('Bitte die Klassenbeschreibung prüfen.');

    expect($variantComment)->not->toBeNull()
        ->and($variantComment?->user_id)->toBe($user->id)
        ->and($variantComment?->body)->toBe('Die Kosten sollten noch geprüft werden.');
});

test('comment authors can delete their own compendium comments', function () {
    $user = User::factory()->create(['is_admin' => false]);
    $item = Item::factory()->create();
    $comment = $item->comments()->create([
        'user_id' => $user->id,
        'body' => 'Eigener Kommentar.',
    ]);

    $this->actingAs($user)
        ->delete(route('compendium.comments.destroy', $comment))
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(CompendiumComment::query()->find($comment->id))->toBeNull();
});

test('admins can delete foreign compendium comments', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $author = User::factory()->create(['is_admin' => false]);
    $spell = Spell::factory()->create();
    $comment = $spell->comments()->create([
        'user_id' => $author->id,
        'body' => 'Bitte die Schule prüfen.',
    ]);

    $this->actingAs($admin)
        ->delete(route('compendium.comments.destroy', $comment))
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(CompendiumComment::query()->find($comment->id))->toBeNull();
});

test('other users cannot delete foreign compendium comments', function () {
    $author = User::factory()->create(['is_admin' => false]);
    $otherUser = User::factory()->create(['is_admin' => false]);
    $item = Item::factory()->create();
    $comment = $item->comments()->create([
        'user_id' => $author->id,
        'body' => 'Nicht loeschen.',
    ]);

    $this->actingAs($otherUser)
        ->delete(route('compendium.comments.destroy', $comment))
        ->assertForbidden();

    expect(CompendiumComment::query()->find($comment->id))->not->toBeNull();
});

test('item compendium page paginates with deferred data', function () {
    $user = User::factory()->create(['is_admin' => false]);
    Item::factory()->count(60)->create();

    $response = $this->actingAs($user)
        ->get(route('compendium.items.index', ['page' => 2, 'per_page' => 25]));

    $response->assertInertia(fn (Assert $page) => $page
        ->where('perPageOptions', [25, 50, 100])
        ->loadDeferredProps('default', fn (Assert $reload) => $reload
            ->has('items', 25)
            ->where('pagination.currentPage', 2)
            ->where('pagination.lastPage', 3)
            ->where('pagination.perPage', 25)
            ->where('pagination.total', 60)
            ->where('pagination.hasMorePages', true)));
});

test('spell compendium page paginates with deferred data', function () {
    $user = User::factory()->create(['is_admin' => false]);
    Spell::factory()->count(60)->create();

    $response = $this->actingAs($user)
        ->get(route('compendium.spells.index', ['page' => 3, 'per_page' => 25]));

    $response->assertInertia(fn (Assert $page) => $page
        ->where('perPageOptions', [25, 50, 100])
        ->loadDeferredProps('default', fn (Assert $reload) => $reload
            ->has('spells', 10)
            ->where('pagination.currentPage', 3)
            ->where('pagination.lastPage', 3)
            ->where('pagination.perPage', 25)
            ->where('pagination.total', 60)
            ->where('pagination.hasMorePages', false)));
});
