<?php

namespace App\Http\Controllers\Spell;

use App\Http\Controllers\Controller;
use App\Http\Requests\Spell\StoreSpellRequest;
use App\Http\Requests\Spell\UpdateSpellRequest;
use App\Models\CompendiumComment;
use App\Models\Source;
use App\Models\Spell;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class SpellController extends Controller
{
    public function index(): Response
    {
        $user = Auth::user();
        $spellSchool = request('spell_school');
        $spellLevel = request('spell_level');
        $guild = request('guild');
        $ruling = request('ruling');
        $searchTerm = request('search', '');
        $perPageOptions = [25, 50, 100];
        $perPage = (int) request('per_page', 50);
        if (! in_array($perPage, $perPageOptions, true)) {
            $perPage = 50;
        }

        $spellQuery = Spell::query();
        $spellQuery->with([
            'source:id,name,shortcode,kind',
            'comments.user:id,name',
        ]);
        $spellQuery->withCount('comments');

        if (! empty($searchTerm)) {
            $spellQuery->where('name', 'LIKE', "%{$searchTerm}%");
        }
        if (! empty($spellSchool)) {
            $spellQuery->where('spell_school', $spellSchool);
        }
        if (! empty($spellLevel)) {
            $spellQuery->where('spell_level', $spellLevel);
        }
        if ($guild === 'allowed') {
            $spellQuery->where('guild_enabled', true);
        } elseif ($guild === 'blocked') {
            $spellQuery->where(function ($query): void {
                $query->whereNull('guild_enabled')->orWhere('guild_enabled', false);
            });
        }
        if ($ruling === 'changed') {
            $spellQuery->where('ruling_changed', true);
        } elseif ($ruling === 'none') {
            $spellQuery->where(function ($query): void {
                $query->whereNull('ruling_changed')->orWhere('ruling_changed', false);
            });
        }

        $spells = $spellQuery
            ->orderBy('spell_level')
            ->orderBy('name')
            ->select([
                'id',
                'name',
                'url',
                'legacy_url',
                'spell_school',
                'spell_level',
                'guild_enabled',
                'ruling_changed',
                'ruling_note',
                'source_id',
            ])
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('spell/index', [
            'spells' => Inertia::defer(fn () => $spells->getCollection()->map(
                fn (Spell $spell): array => $this->serializeSpell($spell, $user?->id, (bool) ($user?->is_admin))
            )->values()->all()),
            'pagination' => Inertia::defer(fn (): array => $this->paginationData($spells)),
            'perPageOptions' => $perPageOptions,
            'sources' => Source::query()
                ->orderBy('shortcode')
                ->orderBy('name')
                ->get(['id', 'name', 'shortcode', 'kind']),
            'canManage' => (bool) ($user?->is_admin),
            'indexRoute' => 'compendium.spells.index',
        ]);
    }

    public function create() {}

    public function store(StoreSpellRequest $request): RedirectResponse
    {
        $spell = new Spell;

        $spell->name = $request->name;
        $spell->url = $request->input('url');
        $spell->legacy_url = $request->input('legacy_url');
        $spell->spell_school = $request->input('spell_school');
        $spell->spell_level = (int) $request->input('spell_level', 0);
        $spell->source_id = $request->input('source_id');
        $spell->guild_enabled = $request->boolean('guild_enabled', true);

        $hasRulingChange = $request->boolean('ruling_changed');
        $note = $hasRulingChange ? trim((string) $request->input('ruling_note', '')) : '';
        $spell->ruling_changed = $hasRulingChange;
        $spell->ruling_note = $note !== '' ? $note : null;

        $spell->save();

        return redirect()->back();
    }

    public function show(Spell $spell) {}

    public function edit(Spell $spell) {}

    public function update(UpdateSpellRequest $request, Spell $spell): RedirectResponse
    {
        $spell->name = $request->name;
        $spell->url = $request->input('url');
        $spell->legacy_url = $request->input('legacy_url');
        $spell->spell_school = $request->input('spell_school');
        $spell->spell_level = (int) $request->input('spell_level', 0);
        $spell->source_id = $request->input('source_id');
        $spell->guild_enabled = $request->boolean('guild_enabled', true);

        $hasRulingChange = $request->boolean('ruling_changed');
        $note = $hasRulingChange ? trim((string) $request->input('ruling_note', '')) : '';
        $spell->ruling_changed = $hasRulingChange;
        $spell->ruling_note = $note !== '' ? $note : null;

        $spell->save();

        return redirect()->back();
    }

    public function destroy(Spell $spell): RedirectResponse
    {
        $spell->delete();

        return redirect()->back();
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeSpell(Spell $spell, ?int $currentUserId, bool $isAdmin): array
    {
        return [
            'id' => $spell->id,
            'name' => $spell->name,
            'url' => $spell->url,
            'legacy_url' => $spell->legacy_url,
            'spell_school' => $spell->spell_school,
            'spell_level' => $spell->spell_level,
            'guild_enabled' => $spell->guild_enabled,
            'ruling_changed' => $spell->ruling_changed,
            'ruling_note' => $spell->ruling_note,
            'source_id' => $spell->source_id,
            'source' => $spell->source,
            'comments_count' => $spell->comments_count ?? $spell->comments->count(),
            'comments' => $spell->comments->map(fn (CompendiumComment $comment): array => [
                'id' => $comment->id,
                'body' => $comment->body,
                'created_at' => optional($comment->created_at)?->toIso8601String(),
                'user' => $comment->user ? [
                    'id' => $comment->user->id,
                    'name' => $comment->user->name,
                ] : null,
                'can_delete' => $isAdmin || ($currentUserId !== null && $comment->user_id === $currentUserId),
            ])->values(),
        ];
    }

    /**
     * @return array{currentPage:int,lastPage:int,perPage:int,total:int,hasMorePages:bool}
     */
    private function paginationData(LengthAwarePaginator $paginator): array
    {
        return [
            'currentPage' => $paginator->currentPage(),
            'lastPage' => $paginator->lastPage(),
            'perPage' => $paginator->perPage(),
            'total' => $paginator->total(),
            'hasMorePages' => $paginator->hasMorePages(),
        ];
    }
}
