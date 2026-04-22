<?php

namespace App\Http\Controllers\CharacterClass;

use App\Http\Controllers\Controller;
use App\Http\Requests\CharacterClass\StoreCharacterClassRequest;
use App\Http\Requests\CharacterClass\UpdateCharacterClassRequest;
use App\Models\CharacterClass;
use App\Models\CharacterSubclass;
use App\Models\CompendiumComment;
use App\Models\Source;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class CharacterClassController extends Controller
{
    public function index(): \Inertia\Response
    {
        $search = request('search', '');
        $guild = request('guild');
        $user = request()->user();

        $currentUserId = $user?->id;
        $isAdmin = (bool) $user?->is_admin;
        $query = CharacterClass::query()->with([
            'source:id,name,shortcode,kind',
            'subclasses.source:id,name,shortcode,kind',
            'comments.user:id,name',
        ])->withCount('comments');

        if (! empty($search)) {
            $query->where('name', 'LIKE', "%{$search}%");
        }
        if ($guild === 'allowed') {
            $query->where('guild_enabled', true);
        } elseif ($guild === 'blocked') {
            $query->where('guild_enabled', false);
        }

        $classes = $query->orderBy('name')->get([
            'id', 'name', 'source_id', 'guild_enabled',
        ]);

        return Inertia::render('character-class/index', [
            'characterClasses' => Inertia::defer(fn () => $classes->map(fn (CharacterClass $characterClass) => [
                'id' => $characterClass->id,
                'name' => $characterClass->name,
                'source_id' => $characterClass->source_id,
                'source' => $characterClass->source ? [
                    'id' => $characterClass->source->id,
                    'name' => $characterClass->source->name,
                    'shortcode' => $characterClass->source->shortcode,
                    'kind' => $characterClass->source->kind,
                ] : null,
                'guild_enabled' => (bool) $characterClass->guild_enabled,
                'comments_count' => $characterClass->comments_count ?? $characterClass->comments->count(),
                'comments' => $characterClass->comments->map(fn (CompendiumComment $comment) => [
                    'id' => $comment->id,
                    'body' => $comment->body,
                    'created_at' => $comment->created_at?->toISOString(),
                    'can_delete' => $isAdmin || ($currentUserId !== null && $comment->user_id === $currentUserId),
                    'user' => $comment->user ? [
                        'id' => $comment->user->id,
                        'name' => $comment->user->name,
                    ] : null,
                ])->values(),
                'subclasses' => $characterClass->subclasses->map(fn (CharacterSubclass $subclass) => [
                    'id' => $subclass->id,
                    'character_class_id' => $subclass->character_class_id,
                    'name' => $subclass->name,
                    'source_id' => $subclass->source_id,
                    'guild_enabled' => (bool) $subclass->guild_enabled,
                    'source' => $subclass->source ? [
                        'id' => $subclass->source->id,
                        'name' => $subclass->source->name,
                        'shortcode' => $subclass->source->shortcode,
                        'kind' => $subclass->source->kind,
                    ] : null,
                ])->values(),
            ])->values()),
            'sources' => Source::query()->orderBy('shortcode')->orderBy('name')->get(['id', 'name', 'shortcode', 'kind']),
            'canManage' => $isAdmin,
            'indexRoute' => 'compendium.character-classes.index',
        ]);
    }

    public function store(StoreCharacterClassRequest $request): RedirectResponse
    {
        $class = new CharacterClass;
        $class->name = $request->input('name');
        $class->source_id = $request->input('source_id') ?: null;
        $class->guild_enabled = $request->boolean('guild_enabled', true);
        $class->save();

        return redirect()->back();
    }

    public function update(UpdateCharacterClassRequest $request, CharacterClass $characterClass): RedirectResponse
    {
        $characterClass->name = $request->input('name');
        $characterClass->source_id = $request->input('source_id') ?: null;
        $characterClass->guild_enabled = $request->boolean('guild_enabled', true);
        $characterClass->save();

        return redirect()->back();
    }

    public function destroy(CharacterClass $characterClass): RedirectResponse
    {
        $characterClass->delete();

        return redirect()->back();
    }
}
