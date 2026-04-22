<?php

namespace App\Http\Controllers\Item;

use App\Http\Controllers\Controller;
use App\Http\Requests\Item\StoreItemRequest;
use App\Http\Requests\Item\UpdateItemRequest;
use App\Models\CompendiumComment;
use App\Models\Item;
use App\Models\MundaneItemVariant;
use App\Models\Source;
use App\Support\ItemCostResolver;
use App\Support\ItemPricing;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ItemController extends Controller
{
    public function index(): Response
    {
        $user = Auth::user();
        $rarity = request('rarity');
        $type = request('type');
        $guild = request('guild');
        $shop = request('shop');
        $spell = request('spell');
        $source = request('source');
        $ruling = request('ruling');
        $searchTerm = request('search');
        $perPageOptions = [25, 50, 100];
        $perPage = (int) request('per_page', 50);
        if (! in_array($perPage, $perPageOptions, true)) {
            $perPage = 50;
        }

        $itemQuery = Item::query();
        $itemQuery->with([
            'source:id,name,shortcode,kind',
            'mundaneVariants:id,name,slug,category,cost_gp,is_placeholder',
            'comments.user:id,name',
        ]);
        $itemQuery->withCount('comments');

        if (! empty($searchTerm)) {
            $itemQuery->where('name', 'LIKE', "%$searchTerm%");
        }
        if (! empty($rarity)) {
            $itemQuery->where('rarity', $rarity);
        }
        if (! empty($type)) {
            $itemQuery->where('type', $type);
        }
        if ($guild === 'allowed') {
            $itemQuery->where('guild_enabled', true);
        } elseif ($guild === 'blocked') {
            $itemQuery->where(function ($query): void {
                $query->whereNull('guild_enabled')->orWhere('guild_enabled', false);
            });
        }
        if ($shop === 'included') {
            $itemQuery->where('shop_enabled', true);
        } elseif ($shop === 'excluded') {
            $itemQuery->where(function ($query): void {
                $query->whereNull('shop_enabled')->orWhere('shop_enabled', false);
            });
        }
        if ($spell === 'attached') {
            $itemQuery->where('default_spell_roll_enabled', true);
        } elseif ($spell === 'none') {
            $itemQuery->where(function ($query): void {
                $query->whereNull('default_spell_roll_enabled')->orWhere('default_spell_roll_enabled', false);
            });
        }
        if ($source === 'none') {
            $itemQuery->whereNull('source_id');
        } elseif (is_numeric($source)) {
            $itemQuery->where('source_id', (int) $source);
        }
        if ($ruling === 'changed') {
            $itemQuery->where('ruling_changed', true);
        } elseif ($ruling === 'none') {
            $itemQuery->where(function ($query): void {
                $query->whereNull('ruling_changed')->orWhere('ruling_changed', false);
            });
        }

        $items = $itemQuery
            ->orderBy('rarity')
            ->orderBy('type')
            ->orderBy('name')
            ->select([
                'id',
                'name',
                'cost',
                'extra_cost_note',
                'url',
                'rarity',
                'type',
                'pick_count',
                'shop_enabled',
                'guild_enabled',
                'default_spell_roll_enabled',
                'default_spell_levels',
                'default_spell_schools',
                'ruling_changed',
                'ruling_note',
                'source_id',
            ])
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('item/index', [
            'items' => Inertia::defer(fn () => $items->getCollection()->map(
                fn (Item $item): array => $this->serializeItem($item, $user?->id, (bool) ($user?->is_admin))
            )->values()->all()),
            'pagination' => Inertia::defer(fn (): array => $this->paginationData($items)),
            'perPageOptions' => $perPageOptions,
            'sources' => Source::query()
                ->orderBy('shortcode')
                ->orderBy('name')
                ->get(['id', 'name', 'shortcode', 'kind']),
            'mundaneVariants' => MundaneItemVariant::query()
                ->orderBy('category')
                ->orderBy('is_placeholder', 'desc')
                ->orderBy('name')
                ->get(['id', 'name', 'slug', 'category', 'cost_gp', 'is_placeholder'])
                ->map(static function (MundaneItemVariant $variant): array {
                    return [
                        'id' => $variant->id,
                        'name' => $variant->name,
                        'slug' => $variant->slug,
                        'category' => $variant->category,
                        'cost_gp' => $variant->cost_gp !== null ? (float) $variant->cost_gp : null,
                        'is_placeholder' => $variant->is_placeholder,
                    ];
                }),
            'canManage' => (bool) ($user?->is_admin),
            'indexRoute' => 'compendium.items.index',
        ]);
    }

    public function create() {}

    public function store(StoreItemRequest $request): RedirectResponse
    {
        $item = new Item;

        $item->name = $request->name;
        $item->cost = ItemPricing::storageCost($request->rarity, $request->type);
        $item->extra_cost_note = $this->resolveExtraCostNote($request, (string) $request->type);
        $item->url = $request->url;
        $item->rarity = $request->rarity;
        $item->type = $request->type;
        $item->source_id = $request->input('source_id');
        $item->shop_enabled = $request->boolean('shop_enabled', true);
        $item->guild_enabled = $request->boolean('guild_enabled', true);
        $this->applyRulingNote($item, $request);
        $this->applyDefaultSpellRoll($item, $request);
        $item->save();
        $item->mundaneVariants()->sync($this->normalizeMundaneVariantIds($request, (string) $request->type));

        return redirect()->back();
    }

    public function show(Item $item) {}

    public function edit(Item $item) {}

    public function update(UpdateItemRequest $request, Item $item): RedirectResponse
    {
        $item->name = $request->name;
        $item->cost = ItemPricing::storageCost($request->rarity, $request->type);
        $item->extra_cost_note = $this->resolveExtraCostNote($request, (string) $request->type);
        $item->url = $request->url;
        $item->rarity = $request->rarity;
        $item->type = $request->type;
        $item->source_id = $request->input('source_id');
        $item->shop_enabled = $request->boolean('shop_enabled', true);
        $item->guild_enabled = $request->boolean('guild_enabled', true);
        $this->applyRulingNote($item, $request);
        $this->applyDefaultSpellRoll($item, $request);
        $item->save();
        $item->mundaneVariants()->sync($this->normalizeMundaneVariantIds($request, (string) $request->type));

        return redirect()->back();
    }

    public function destroy(Item $item): RedirectResponse
    {
        $item->delete();

        return redirect()->back();
    }

    private function applyDefaultSpellRoll(Item $item, Request $request): void
    {
        $levels = $request->input('default_spell_levels');
        $schools = $request->input('default_spell_schools');

        $levels = array_values(array_unique(array_filter(array_map(
            static fn ($value) => is_numeric($value) ? (int) $value : null,
            (array) $levels
        ), static fn ($value) => $value !== null && $value >= 0 && $value <= 9)));
        $schools = array_values(array_unique(array_filter(array_map(
            static fn ($value) => $value !== null ? (string) $value : null,
            (array) $schools
        ), static fn ($value) => $value !== null && $value !== '')));

        $autoRoll = $request->boolean('default_spell_roll_enabled') && count($levels) > 0;

        $item->default_spell_roll_enabled = $autoRoll;
        $item->default_spell_levels = $autoRoll ? $levels : null;
        $item->default_spell_schools = $autoRoll ? ($schools === [] ? null : $schools) : null;
    }

    private function applyRulingNote(Item $item, Request $request): void
    {
        $hasRulingChange = $request->boolean('ruling_changed');
        $note = $hasRulingChange ? trim((string) $request->input('ruling_note', '')) : '';

        $item->ruling_changed = $hasRulingChange;
        $item->ruling_note = $note !== '' ? $note : null;
    }

    /**
     * @return array<int, int>
     */
    private function normalizeMundaneVariantIds(Request $request, string $type): array
    {
        if (! in_array($type, ['weapon', 'armor'], true)) {
            return [];
        }

        $requestedIds = array_values(array_unique(array_filter(array_map(
            static fn ($value) => is_numeric($value) ? (int) $value : null,
            (array) $request->input('mundane_variant_ids', [])
        ), static fn ($id) => $id !== null && $id > 0)));

        if ($requestedIds === []) {
            return [];
        }

        $selectedVariants = MundaneItemVariant::query()
            ->where('category', $type)
            ->whereIn('id', $requestedIds)
            ->get(['id', 'is_placeholder']);

        $placeholderId = $selectedVariants
            ->first(static fn (MundaneItemVariant $variant): bool => $variant->is_placeholder)
            ?->id;

        if ($placeholderId !== null) {
            return [(int) $placeholderId];
        }

        return $selectedVariants
            ->pluck('id')
            ->map(static fn ($id): int => (int) $id)
            ->values()
            ->all();
    }

    private function resolveExtraCostNote(Request $request, string $type): ?string
    {
        if (in_array($type, ['weapon', 'armor'], true)) {
            return null;
        }

        $note = trim((string) $request->input('extra_cost_note', ''));
        if ($note === '') {
            return null;
        }

        $note = preg_replace('/^\+\s*/u', '', $note) ?? $note;
        $note = trim($note);

        return $note !== '' ? $note : null;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeItem(Item $item, ?int $currentUserId, bool $isAdmin): array
    {
        return [
            'id' => $item->id,
            'name' => $item->name,
            'cost' => $item->cost,
            'extra_cost_note' => $item->extra_cost_note,
            'display_cost' => ItemCostResolver::resolveForItem($item),
            'url' => $item->url,
            'rarity' => $item->rarity,
            'type' => $item->type,
            'pick_count' => $item->pick_count,
            'shop_enabled' => $item->shop_enabled,
            'guild_enabled' => $item->guild_enabled,
            'default_spell_roll_enabled' => $item->default_spell_roll_enabled,
            'default_spell_levels' => $item->default_spell_levels,
            'default_spell_schools' => $item->default_spell_schools,
            'ruling_changed' => $item->ruling_changed,
            'ruling_note' => $item->ruling_note,
            'source_id' => $item->source_id,
            'source' => $item->source,
            'comments_count' => $item->comments_count ?? $item->comments->count(),
            'comments' => $item->comments->map(fn (CompendiumComment $comment): array => [
                'id' => $comment->id,
                'body' => $comment->body,
                'created_at' => optional($comment->created_at)?->toIso8601String(),
                'user' => $comment->user ? [
                    'id' => $comment->user->id,
                    'name' => $comment->user->name,
                ] : null,
                'can_delete' => $isAdmin || ($currentUserId !== null && $comment->user_id === $currentUserId),
            ])->values(),
            'mundane_variant_ids' => $item->mundaneVariants->pluck('id')->values(),
            'mundane_variants' => $item->mundaneVariants->map(static function (MundaneItemVariant $variant): array {
                return [
                    'id' => $variant->id,
                    'name' => $variant->name,
                    'slug' => $variant->slug,
                    'category' => $variant->category,
                    'cost_gp' => $variant->cost_gp !== null ? (float) $variant->cost_gp : null,
                    'is_placeholder' => $variant->is_placeholder,
                ];
            })->values(),
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
