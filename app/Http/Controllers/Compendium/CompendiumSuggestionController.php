<?php

namespace App\Http\Controllers\Compendium;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReviewCompendiumSuggestionRequest;
use App\Http\Requests\Compendium\StoreCompendiumSuggestionRequest;
use App\Models\CompendiumSuggestion;
use App\Models\Item;
use App\Models\MundaneItemVariant;
use App\Models\Source;
use App\Models\Spell;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Validator as ValidationValidator;
use Inertia\Inertia;
use Inertia\Response;

class CompendiumSuggestionController extends Controller
{
    /**
     * @var array<string, array<int, string>>
     */
    private const CHANGEABLE_FIELDS = [
        CompendiumSuggestion::KIND_ITEM => [
            'name',
            'url',
            'cost',
            'extra_cost_note',
            'rarity',
            'type',
            'source_id',
            'mundane_variant_ids',
        ],
        CompendiumSuggestion::KIND_SPELL => [
            'name',
            'url',
            'legacy_url',
            'spell_school',
            'spell_level',
            'source_id',
        ],
    ];

    public function store(StoreCompendiumSuggestionRequest $request): RedirectResponse
    {
        $kind = (string) $request->string('kind');
        $targetId = $request->filled('target_id') ? (int) $request->integer('target_id') : null;
        $target = $targetId !== null ? $this->resolveTarget($kind, $targetId) : null;

        if ($targetId !== null && ! $target) {
            return redirect()->back()->withErrors([
                'target_id' => 'The selected compendium entry was not found.',
            ]);
        }

        if ($targetId === null && $kind !== CompendiumSuggestion::KIND_ITEM) {
            return redirect()->back()->withErrors([
                'target_id' => 'The selected compendium entry was not found.',
            ]);
        }

        $snapshot = $target ? $this->snapshotForTarget($kind, $target) : [];
        $normalizedChanges = $this->normalizeChanges($kind, (array) $request->input('changes', []));
        $effectiveChanges = $target
            ? $this->effectiveChanges($snapshot, $normalizedChanges)
            : $normalizedChanges;

        if ($effectiveChanges !== []) {
            $candidate = $target ? array_replace($snapshot, $effectiveChanges) : $effectiveChanges;
            $this->validateCandidate($kind, $candidate);
        }

        $notes = trim((string) $request->input('notes', ''));
        if ($target && $effectiveChanges === [] && $notes === '') {
            return redirect()->back()->withErrors([
                'changes' => 'Please provide at least one changed field or a note.',
            ]);
        }

        if (! $target && $effectiveChanges === []) {
            return redirect()->back()->withErrors([
                'changes' => 'Please provide the required fields for a new item suggestion.',
            ]);
        }

        CompendiumSuggestion::query()->create([
            'user_id' => $request->user()->id,
            'kind' => $kind,
            'target_id' => $targetId,
            'status' => CompendiumSuggestion::STATUS_PENDING,
            'proposed_payload' => $effectiveChanges,
            'current_snapshot' => $snapshot === [] ? null : $snapshot,
            'notes' => $notes !== '' ? $notes : null,
            'source_url' => $this->normalizeNullableString($request->input('source_url')),
        ]);

        return redirect()->back();
    }

    public function index(Request $request): Response
    {
        $status = (string) $request->query('status', '');
        $kind = (string) $request->query('kind', '');
        $search = trim((string) $request->query('search', ''));

        $suggestionsQuery = CompendiumSuggestion::query()
            ->with(['user:id,name', 'reviewer:id,name'])
            ->orderByDesc('id');

        if (in_array($status, [
            CompendiumSuggestion::STATUS_PENDING,
            CompendiumSuggestion::STATUS_APPROVED,
            CompendiumSuggestion::STATUS_REJECTED,
        ], true)) {
            $suggestionsQuery->where('status', $status);
        }

        if (in_array($kind, [CompendiumSuggestion::KIND_ITEM, CompendiumSuggestion::KIND_SPELL], true)) {
            $suggestionsQuery->where('kind', $kind);
        }

        if ($search !== '') {
            $suggestionsQuery->where(function ($query) use ($search) {
                $query
                    ->where('notes', 'like', "%{$search}%")
                    ->orWhere('source_url', 'like', "%{$search}%");

                if (is_numeric($search)) {
                    $query
                        ->orWhere('id', (int) $search)
                        ->orWhere('target_id', (int) $search);
                }
            });
        }

        $suggestions = $suggestionsQuery->get();

        $itemNames = $this->itemNamesForSuggestions($suggestions);
        $spellNames = $this->spellNamesForSuggestions($suggestions);
        $sourceLabels = Source::query()
            ->orderBy('name')
            ->pluck('name', 'id')
            ->map(static fn ($name): string => (string) $name);
        $variantLabels = MundaneItemVariant::query()
            ->orderBy('category')
            ->orderBy('is_placeholder', 'desc')
            ->orderBy('name')
            ->get(['id', 'name', 'category', 'is_placeholder'])
            ->mapWithKeys(static function (MundaneItemVariant $variant): array {
                $label = $variant->is_placeholder
                    ? $variant->name
                    : sprintf('%s (%s)', $variant->name, $variant->category);

                return [
                    (string) $variant->id => $label,
                ];
            });
        $variantMeta = MundaneItemVariant::query()
            ->orderBy('category')
            ->orderBy('is_placeholder', 'desc')
            ->orderBy('name')
            ->get(['id', 'name', 'category', 'is_placeholder'])
            ->mapWithKeys(static fn (MundaneItemVariant $variant): array => [
                (string) $variant->id => [
                    'id' => $variant->id,
                    'name' => $variant->name,
                    'category' => $variant->category,
                    'is_placeholder' => $variant->is_placeholder,
                ],
            ]);

        return Inertia::render('admin/compendium-suggestions', [
            'suggestions' => $suggestions->map(function (CompendiumSuggestion $suggestion) use ($itemNames, $spellNames): array {
                $targetName = null;
                if ($suggestion->target_id === null && $suggestion->kind === CompendiumSuggestion::KIND_ITEM) {
                    $targetName = 'New item suggestion';
                } elseif ($suggestion->target_id !== null) {
                    $targetName = $suggestion->kind === CompendiumSuggestion::KIND_ITEM
                        ? $itemNames->get($suggestion->target_id)
                        : $spellNames->get($suggestion->target_id);
                }

                return [
                    'id' => $suggestion->id,
                    'kind' => $suggestion->kind,
                    'target_id' => $suggestion->target_id,
                    'target_name' => $targetName,
                    'status' => $suggestion->status,
                    'proposed_payload' => $suggestion->proposed_payload ?? [],
                    'current_snapshot' => $suggestion->current_snapshot ?? [],
                    'notes' => $suggestion->notes,
                    'source_url' => $suggestion->source_url,
                    'review_notes' => $suggestion->review_notes,
                    'reviewed_at' => optional($suggestion->reviewed_at)?->toIso8601String(),
                    'created_at' => optional($suggestion->created_at)?->toIso8601String(),
                    'user' => $suggestion->user ? [
                        'id' => $suggestion->user->id,
                        'name' => $suggestion->user->name,
                    ] : null,
                    'reviewer' => $suggestion->reviewer ? [
                        'id' => $suggestion->reviewer->id,
                        'name' => $suggestion->reviewer->name,
                    ] : null,
                ];
            })->values(),
            'filters' => [
                'status' => $status,
                'kind' => $kind,
                'search' => $search,
            ],
            'counts' => [
                CompendiumSuggestion::STATUS_PENDING => CompendiumSuggestion::query()->where('status', CompendiumSuggestion::STATUS_PENDING)->count(),
                CompendiumSuggestion::STATUS_APPROVED => CompendiumSuggestion::query()->where('status', CompendiumSuggestion::STATUS_APPROVED)->count(),
                CompendiumSuggestion::STATUS_REJECTED => CompendiumSuggestion::query()->where('status', CompendiumSuggestion::STATUS_REJECTED)->count(),
            ],
            'sourceLabels' => $sourceLabels,
            'variantLabels' => $variantLabels,
            'variantMeta' => $variantMeta,
        ]);
    }

    public function approve(ReviewCompendiumSuggestionRequest $request, CompendiumSuggestion $compendiumSuggestion): RedirectResponse
    {
        if ($compendiumSuggestion->status !== CompendiumSuggestion::STATUS_PENDING) {
            return redirect()->back()->withErrors([
                'suggestion' => 'This suggestion has already been reviewed.',
            ]);
        }

        DB::transaction(function () use ($request, $compendiumSuggestion): void {
            $rawChanges = $this->extractRawChangesPayload($compendiumSuggestion->proposed_payload);
            $changes = $this->normalizeChanges(
                $compendiumSuggestion->kind,
                $rawChanges,
            );

            if ($changes === [] && $rawChanges !== []) {
                throw ValidationException::withMessages([
                    'suggestion' => 'No applicable fields were found in this suggestion payload.',
                ]);
            }

            if ($changes !== []) {
                if ($compendiumSuggestion->target_id === null) {
                    if ($compendiumSuggestion->kind !== CompendiumSuggestion::KIND_ITEM) {
                        throw ValidationException::withMessages([
                            'suggestion' => 'Creating new entries is only supported for item suggestions.',
                        ]);
                    }

                    $this->validateCandidate($compendiumSuggestion->kind, $changes);
                    $target = $this->createTarget($compendiumSuggestion->kind, $changes);
                    if ($target instanceof Item && array_key_exists('mundane_variant_ids', $changes)) {
                        $target->mundaneVariants()->sync($this->normalizeMundaneVariantIds($changes['mundane_variant_ids']));
                    }
                    $compendiumSuggestion->target_id = $target->id;
                    $compendiumSuggestion->current_snapshot = $this->snapshotForTarget($compendiumSuggestion->kind, $target);
                } else {
                    $target = $this->resolveTarget($compendiumSuggestion->kind, (int) $compendiumSuggestion->target_id);
                    if (! $target) {
                        throw ValidationException::withMessages([
                            'suggestion' => 'The target entry no longer exists.',
                        ]);
                    }

                    $snapshot = $this->snapshotForTarget($compendiumSuggestion->kind, $target);
                    $candidate = array_replace($snapshot, $changes);
                    $this->validateCandidate($compendiumSuggestion->kind, $candidate);
                    $this->applyChanges($target, $changes);
                    $target->save();
                }
            }

            $reviewNotes = trim((string) $request->input('review_notes', ''));
            $compendiumSuggestion->status = CompendiumSuggestion::STATUS_APPROVED;
            $compendiumSuggestion->reviewed_by = $request->user()->id;
            $compendiumSuggestion->reviewed_at = now();
            $compendiumSuggestion->review_notes = $reviewNotes !== '' ? $reviewNotes : null;
            $compendiumSuggestion->save();
        });

        return redirect()->back();
    }

    /**
     * @return array<string, mixed>
     */
    private function extractRawChangesPayload(mixed $payload): array
    {
        if (is_array($payload)) {
            if (isset($payload['changes']) && is_array($payload['changes'])) {
                /** @var array<string, mixed> $nested */
                $nested = $payload['changes'];

                return $nested;
            }

            /** @var array<string, mixed> $payload */
            return $payload;
        }

        if (is_string($payload)) {
            $decoded = json_decode($payload, true);
            if (is_array($decoded)) {
                if (isset($decoded['changes']) && is_array($decoded['changes'])) {
                    /** @var array<string, mixed> $nested */
                    $nested = $decoded['changes'];

                    return $nested;
                }

                /** @var array<string, mixed> $decoded */
                return $decoded;
            }
        }

        return [];
    }

    public function reject(ReviewCompendiumSuggestionRequest $request, CompendiumSuggestion $compendiumSuggestion): RedirectResponse
    {
        if ($compendiumSuggestion->status !== CompendiumSuggestion::STATUS_PENDING) {
            return redirect()->back()->withErrors([
                'suggestion' => 'This suggestion has already been reviewed.',
            ]);
        }

        $reviewNotes = trim((string) $request->input('review_notes', ''));
        $compendiumSuggestion->status = CompendiumSuggestion::STATUS_REJECTED;
        $compendiumSuggestion->reviewed_by = $request->user()->id;
        $compendiumSuggestion->reviewed_at = now();
        $compendiumSuggestion->review_notes = $reviewNotes !== '' ? $reviewNotes : null;
        $compendiumSuggestion->save();

        return redirect()->back();
    }

    /**
     * @param  array<string, mixed>  $changes
     * @return array<string, mixed>
     */
    private function normalizeChanges(string $kind, array $changes): array
    {
        $allowedFields = self::CHANGEABLE_FIELDS[$kind] ?? [];
        $normalized = [];

        foreach ($allowedFields as $field) {
            if (! array_key_exists($field, $changes)) {
                continue;
            }

            $value = $changes[$field];
            if ($field === 'source_id') {
                $normalized[$field] = $this->normalizeNullableInteger($value);

                continue;
            }

            if ($field === 'mundane_variant_ids') {
                $normalized[$field] = $this->normalizeMundaneVariantIds($value);

                continue;
            }

            if ($field === 'spell_level') {
                $normalized[$field] = is_numeric($value) ? (int) $value : $value;

                continue;
            }

            if (in_array($field, ['rarity', 'type', 'spell_school'], true)) {
                $normalized[$field] = $this->normalizeNullableString($value, true);

                continue;
            }

            if (in_array($field, ['url', 'legacy_url', 'cost', 'extra_cost_note'], true)) {
                $normalized[$field] = $this->normalizeNullableString($value);

                continue;
            }

            if ($field === 'name') {
                $normalized[$field] = trim((string) $value);
            }
        }

        return $normalized;
    }

    /**
     * @param  array<string, mixed>  $snapshot
     * @param  array<string, mixed>  $changes
     * @return array<string, mixed>
     */
    private function effectiveChanges(array $snapshot, array $changes): array
    {
        $effective = [];

        foreach ($changes as $field => $value) {
            if (! $this->valuesEquivalent($snapshot[$field] ?? null, $value)) {
                $effective[$field] = $value;
            }
        }

        return $effective;
    }

    /**
     * @return array<string, mixed>
     */
    private function snapshotForTarget(string $kind, Item|Spell $target): array
    {
        if ($kind === CompendiumSuggestion::KIND_ITEM) {
            return [
                'name' => (string) $target->name,
                'url' => $target->url,
                'cost' => $target->cost,
                'extra_cost_note' => $target->extra_cost_note,
                'rarity' => (string) $target->rarity,
                'type' => (string) $target->type,
                'source_id' => $target->source_id === null ? null : (int) $target->source_id,
                'mundane_variant_ids' => $target->mundaneVariants()
                    ->pluck('mundane_item_variants.id')
                    ->map(static fn ($id): int => (int) $id)
                    ->sort()
                    ->values()
                    ->all(),
            ];
        }

        return [
            'name' => (string) $target->name,
            'url' => $target->url,
            'legacy_url' => $target->legacy_url,
            'spell_school' => $target->spell_school,
            'spell_level' => (int) $target->spell_level,
            'source_id' => $target->source_id === null ? null : (int) $target->source_id,
        ];
    }

    /**
     * @param  array<string, mixed>  $changes
     */
    private function applyChanges(Item|Spell $target, array $changes): void
    {
        $mundaneVariantIds = null;
        if ($target instanceof Item && array_key_exists('mundane_variant_ids', $changes)) {
            $mundaneVariantIds = $this->normalizeMundaneVariantIds($changes['mundane_variant_ids']);
            unset($changes['mundane_variant_ids']);
        }

        foreach ($changes as $field => $value) {
            $target->{$field} = $value;
        }

        if ($target instanceof Item && $mundaneVariantIds !== null) {
            $target->mundaneVariants()->sync($mundaneVariantIds);
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function createTarget(string $kind, array $payload): Item|Spell
    {
        if ($kind === CompendiumSuggestion::KIND_ITEM) {
            if (array_key_exists('mundane_variant_ids', $payload)) {
                unset($payload['mundane_variant_ids']);
            }

            $item = new Item;
            $item->forceFill($payload)->save();

            return $item;
        }

        if ($kind === CompendiumSuggestion::KIND_SPELL) {
            $spell = new Spell;
            $spell->forceFill($payload)->save();

            return $spell;
        }

        throw ValidationException::withMessages([
            'kind' => 'Unsupported suggestion kind.',
        ]);
    }

    /**
     * @param  array<string, mixed>  $candidate
     */
    private function validateCandidate(string $kind, array $candidate): void
    {
        $validator = Validator::make($candidate, $this->validationRulesForKind($kind));
        if ($kind === CompendiumSuggestion::KIND_ITEM) {
            $validator->after(function (ValidationValidator $validator) use ($candidate): void {
                $this->validateItemCandidateMundaneVariants($validator, $candidate);
            });
        }

        if ($validator->fails()) {
            throw ValidationException::withMessages($validator->errors()->toArray());
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function validationRulesForKind(string $kind): array
    {
        if ($kind === CompendiumSuggestion::KIND_ITEM) {
            return [
                'name' => 'required|string',
                'url' => 'nullable|url|max:2048',
                'cost' => 'nullable|string',
                'extra_cost_note' => 'nullable|string|max:255',
                'rarity' => 'required|in:common,uncommon,rare,very_rare,legendary,artifact,unknown_rarity',
                'type' => 'required|in:weapon,armor,item,consumable,spellscroll',
                'source_id' => 'nullable|integer|exists:sources,id',
                'mundane_variant_ids' => 'nullable|array',
                'mundane_variant_ids.*' => 'integer|exists:mundane_item_variants,id',
            ];
        }

        return [
            'name' => 'required|string',
            'url' => 'nullable|url|max:2048',
            'legacy_url' => 'nullable|url|max:2048',
            'spell_school' => 'nullable|in:abjuration,conjuration,divination,enchantment,evocation,illusion,necromancy,transmutation',
            'spell_level' => 'required|integer|min:0|max:9',
            'source_id' => 'nullable|integer|exists:sources,id',
        ];
    }

    private function resolveTarget(string $kind, ?int $targetId): Item|Spell|null
    {
        if ($targetId === null) {
            return null;
        }

        if ($kind === CompendiumSuggestion::KIND_ITEM) {
            return Item::query()->find($targetId);
        }

        if ($kind === CompendiumSuggestion::KIND_SPELL) {
            return Spell::query()->find($targetId);
        }

        return null;
    }

    /**
     * @param  Collection<int, CompendiumSuggestion>  $suggestions
     * @return Collection<int, string>
     */
    private function itemNamesForSuggestions(Collection $suggestions): Collection
    {
        $itemIds = $suggestions
            ->where('kind', CompendiumSuggestion::KIND_ITEM)
            ->pluck('target_id')
            ->filter(static fn ($id) => $id !== null)
            ->map(static fn ($id) => (int) $id)
            ->unique()
            ->values();

        if ($itemIds->isEmpty()) {
            return collect();
        }

        return Item::query()
            ->withTrashed()
            ->whereIn('id', $itemIds->all())
            ->pluck('name', 'id')
            ->map(static fn ($name) => (string) $name);
    }

    /**
     * @param  Collection<int, CompendiumSuggestion>  $suggestions
     * @return Collection<int, string>
     */
    private function spellNamesForSuggestions(Collection $suggestions): Collection
    {
        $spellIds = $suggestions
            ->where('kind', CompendiumSuggestion::KIND_SPELL)
            ->pluck('target_id')
            ->filter(static fn ($id) => $id !== null)
            ->map(static fn ($id) => (int) $id)
            ->unique()
            ->values();

        if ($spellIds->isEmpty()) {
            return collect();
        }

        return Spell::query()
            ->withTrashed()
            ->whereIn('id', $spellIds->all())
            ->pluck('name', 'id')
            ->map(static fn ($name) => (string) $name);
    }

    private function normalizeNullableString(mixed $value, bool $lowercase = false): ?string
    {
        $text = trim((string) ($value ?? ''));
        if ($text === '') {
            return null;
        }

        return $lowercase ? mb_strtolower($text) : $text;
    }

    private function normalizeNullableInteger(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_numeric($value) ? (int) $value : null;
    }

    /**
     * @return array<int, int>
     */
    private function normalizeMundaneVariantIds(mixed $value): array
    {
        return collect((array) $value)
            ->map(static fn ($entry) => is_numeric($entry) ? (int) $entry : null)
            ->filter(static fn ($entry) => $entry !== null && $entry > 0)
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $candidate
     */
    private function validateItemCandidateMundaneVariants(ValidationValidator $validator, array $candidate): void
    {
        $type = (string) ($candidate['type'] ?? '');
        $extraCostNote = trim((string) ($candidate['extra_cost_note'] ?? ''));
        $variantIds = $this->normalizeMundaneVariantIds($candidate['mundane_variant_ids'] ?? []);

        if (in_array($type, ['weapon', 'armor'], true)) {
            if ($extraCostNote !== '') {
                $validator->errors()->add('extra_cost_note', 'Extra cost note is only allowed for item, consumable, or spell scroll.');
            }

            if ($variantIds === []) {
                return;
            }

            $selectedVariants = MundaneItemVariant::query()
                ->whereIn('id', $variantIds)
                ->get(['id', 'category', 'is_placeholder']);

            $invalidCount = $selectedVariants
                ->where('category', '!=', $type)
                ->count();

            if ($invalidCount > 0) {
                $validator->errors()->add('mundane_variant_ids', "Only {$type} variants can be attached to {$type} items.");
            }

            $hasAnyOption = $selectedVariants->contains(static fn (MundaneItemVariant $variant): bool => $variant->is_placeholder);
            if ($hasAnyOption && count($variantIds) > 1) {
                $label = ucfirst($type);
                $validator->errors()->add('mundane_variant_ids', "The Any {$label} option cannot be combined with specific {$type} variants.");
            }

            return;
        }

        if (! in_array($type, ['item', 'consumable', 'spellscroll'], true)) {
            return;
        }

        if ($variantIds !== []) {
            $validator->errors()->add('mundane_variant_ids', 'Mundane variants are only allowed for weapon or armor items.');
        }
    }

    private function valuesEquivalent(mixed $left, mixed $right): bool
    {
        return json_encode($left) === json_encode($right);
    }
}
