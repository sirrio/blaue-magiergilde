<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Character;
use App\Models\LegacyCharacterApproval;
use App\Models\User;
use App\Services\CharacterApprovalNotificationService;
use App\Support\DndBeyondCharacterLink;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CharacterApprovalController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user && $user->is_admin, 403);

        $search = trim((string) $request->input('search', ''));
        $status = $request->input('status');
        $tier = $request->input('tier');
        $discordFilter = $request->input('discord');
        $legacyFilter = $request->input('legacy');
        $noDiscord = $request->boolean('no_discord');

        $lightweightCharacters = $this->buildFilteredCharacterIdsQuery(
            $search,
            $status,
            $tier,
            $discordFilter,
            $noDiscord,
        )
            ->orderBy('user_id')
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'user_id',
                'external_link',
            ]);

        $filteredCharacterIds = $this->filterCharacterIdsByLegacy(
            $lightweightCharacters,
            $legacyFilter,
        );

        $characterUserIds = $filteredCharacterIds
            ->pluck('user_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        $includeEmptyUsers = blank($status) && blank($tier) && blank($legacyFilter);
        $pageSize = 10;
        $emptyUserIds = $includeEmptyUsers
            ? $this->buildEmptyUsersQuery($search, $discordFilter, $noDiscord, $characterUserIds)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all()
            : [];
        $paginatedUsers = $this->buildApprovalUsersPaginator(
            array_values(array_unique([...$characterUserIds, ...$emptyUserIds])),
            $pageSize,
        );

        $pageUserIds = $paginatedUsers->getCollection()
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values();
        $pageUserOrder = $pageUserIds->flip();
        $pageCharacterIds = $filteredCharacterIds
            ->filter(fn (Character $character) => $pageUserIds->contains((int) $character->user_id))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $characters = $this->buildCharacterDetailsQuery($pageCharacterIds)
            ->get([
                'id',
                'name',
                'user_id',
                'external_link',
                'start_tier',
                'version',
                'faction',
                'guild_status',
                'registration_note',
                'review_note',
                'notes',
                'admin_notes',
                'dm_bubbles',
                'dm_coins',
                'bubble_shop_spend',
                'is_filler',
                'admin_managed',
                'avatar',
                'simplified_tracking',
            ]);

        $characters = $this->attachLegacyApprovalData($characters)
            ->sort(function (Character $left, Character $right) use ($pageUserOrder) {
                $leftOrder = $pageUserOrder->get((int) $left->user_id, PHP_INT_MAX);
                $rightOrder = $pageUserOrder->get((int) $right->user_id, PHP_INT_MAX);

                if ($leftOrder !== $rightOrder) {
                    return $leftOrder <=> $rightOrder;
                }

                return strcasecmp($left->name, $right->name);
            })
            ->values();

        $characterUserIdsOnPage = $characters
            ->pluck('user_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        $emptyUsers = $paginatedUsers->getCollection()
            ->filter(fn (User $approvalUser) => ! in_array((int) $approvalUser->id, $characterUserIdsOnPage, true))
            ->values();

        return Inertia::render('character-approvals/list', [
            'characters' => $characters,
            'emptyUsers' => $emptyUsers,
            'userOrder' => $pageUserIds->all(),
            'pagination' => [
                'currentPage' => $paginatedUsers->currentPage(),
                'lastPage' => $paginatedUsers->lastPage(),
                'perPage' => $paginatedUsers->perPage(),
                'total' => $paginatedUsers->total(),
                'hasMorePages' => $paginatedUsers->hasMorePages(),
            ],
        ]);
    }

    private function buildFilteredCharacterIdsQuery(
        string $search,
        mixed $status,
        mixed $tier,
        mixed $discordFilter,
        bool $noDiscord,
    ): Builder {
        $query = Character::query()
            ->select(['id', 'name', 'user_id', 'external_link']);

        if ($search !== '') {
            $query->where(function (Builder $characterQuery) use ($search) {
                $characterQuery->where('name', 'LIKE', "%{$search}%")
                    ->orWhereHas('user', function (Builder $userQuery) use ($search) {
                        $userQuery->where('name', 'LIKE', "%{$search}%")
                            ->orWhere('discord_username', 'LIKE', "%{$search}%")
                            ->orWhere('discord_display_name', 'LIKE', "%{$search}%")
                            ->orWhere('discord_id', 'LIKE', "%{$search}%");
                    });
            });
        }

        if (in_array($status, ['pending', 'approved', 'declined', 'needs_changes', 'retired', 'draft'], true)) {
            $query->where('guild_status', $status);
        }

        if (in_array($tier, ['bt', 'lt', 'ht', 'et', 'filler'], true)) {
            $query->where('start_tier', $tier);
        }

        if ($discordFilter === 'only') {
            $query->whereHas('user', function (Builder $userQuery) {
                $userQuery->whereNotNull('discord_id');
            });
        } elseif ($discordFilter === 'none' || $noDiscord) {
            $query->whereHas('user', function (Builder $userQuery) {
                $userQuery->whereNull('discord_id');
            });
        }

        return $query;
    }

    private function buildEmptyUsersQuery(
        string $search,
        mixed $discordFilter,
        bool $noDiscord,
        array $characterUserIds,
    ): Builder {
        $query = User::query()
            ->select([
                'id',
                'name',
                'discord_id',
                'discord_username',
                'discord_display_name',
                'avatar',
                'simplified_tracking',
            ]);

        if ($characterUserIds !== []) {
            $query->whereNotIn('id', $characterUserIds);
        }

        if ($search !== '') {
            $query->where(function (Builder $userQuery) use ($search) {
                $userQuery->where('name', 'LIKE', "%{$search}%")
                    ->orWhere('discord_username', 'LIKE', "%{$search}%")
                    ->orWhere('discord_display_name', 'LIKE', "%{$search}%")
                    ->orWhere('discord_id', 'LIKE', "%{$search}%");
            });
        }

        if ($discordFilter === 'only') {
            $query->whereNotNull('discord_id');
        } elseif ($discordFilter === 'none' || $noDiscord) {
            $query->whereNull('discord_id');
        }

        return $query;
    }

    private function buildApprovalUsersPaginator(array $userIds, int $perPage): LengthAwarePaginator
    {
        if ($userIds === []) {
            return User::query()
                ->select([
                    'id',
                    'name',
                    'discord_id',
                    'discord_username',
                    'discord_display_name',
                    'avatar',
                    'simplified_tracking',
                ])
                ->whereRaw('1 = 0')
                ->paginate($perPage)
                ->withQueryString();
        }

        return User::query()
            ->select([
                'id',
                'name',
                'discord_id',
                'discord_username',
                'discord_display_name',
                'avatar',
                'simplified_tracking',
            ])
            ->whereIn('id', $userIds)
            ->withCount([
                'characters as submitted_characters_count' => fn (Builder $characterQuery) => $characterQuery
                    ->where('guild_status', '!=', 'draft'),
            ])
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();
    }

    private function buildCharacterDetailsQuery(array $characterIds): Builder
    {
        return Character::query()
            ->without(['allies', 'downtimes', 'characterClasses'])
            ->withCount([
                'room',
                'adventures as adventure_additional_bubbles_count' => fn (Builder $adventureQuery) => $adventureQuery
                    ->where('has_additional_bubble', true),
            ])
            ->withSum('adventures as total_adventure_duration', 'duration')
            ->with([
                'user' => fn ($query) => $query
                    ->select(['id', 'name', 'discord_id', 'discord_username', 'discord_display_name', 'avatar'])
                    ->withCount([
                        'characters as submitted_characters_count' => fn (Builder $characterQuery) => $characterQuery
                            ->where('guild_status', '!=', 'draft'),
                    ]),
                'characterClasses:id,name',
            ])
            ->whereKey($characterIds);
    }

    private function filterCharacterIdsByLegacy(
        Collection $characters,
        mixed $legacyFilter,
    ): Collection {
        $characterIdsByCharacterId = $characters
            ->mapWithKeys(fn (Character $character) => [$character->id => DndBeyondCharacterLink::extractId($character->external_link)])
            ->filter();

        if ($characterIdsByCharacterId->isEmpty()) {
            return $legacyFilter === 'matched'
                ? collect()
                : $characters->values();
        }

        $legacyMatches = LegacyCharacterApproval::query()
            ->whereIn('dndbeyond_character_id', $characterIdsByCharacterId->values())
            ->pluck('dndbeyond_character_id')
            ->flip();

        return $characters
            ->filter(function (Character $character) use ($characterIdsByCharacterId, $legacyMatches, $legacyFilter) {
                $dndBeyondCharacterId = $characterIdsByCharacterId[$character->id] ?? null;
                $hasLegacyApproval = $dndBeyondCharacterId !== null && $legacyMatches->has($dndBeyondCharacterId);

                if ($legacyFilter === 'matched') {
                    return $hasLegacyApproval;
                }

                if ($legacyFilter === 'missing') {
                    return ! $hasLegacyApproval;
                }

                return true;
            })
            ->values();
    }

    private function attachLegacyApprovalData(EloquentCollection $characters): EloquentCollection
    {
        $characterIdsByCharacterId = $characters
            ->mapWithKeys(fn (Character $character) => [$character->id => DndBeyondCharacterLink::extractId($character->external_link)])
            ->filter();

        $legacyMatches = LegacyCharacterApproval::query()
            ->whereIn('dndbeyond_character_id', $characterIdsByCharacterId->values())
            ->get([
                'id',
                'discord_name',
                'player_name',
                'room',
                'tier',
                'character_name',
                'external_link',
                'dndbeyond_character_id',
                'source_row',
                'source_column',
            ])
            ->keyBy('dndbeyond_character_id');

        return $characters
            ->map(function (Character $character) use ($characterIdsByCharacterId, $legacyMatches) {
                $dndBeyondCharacterId = $characterIdsByCharacterId[$character->id] ?? null;
                $legacyMatch = $dndBeyondCharacterId !== null ? $legacyMatches->get($dndBeyondCharacterId) : null;

                $character->setAttribute('dndbeyond_character_id', $dndBeyondCharacterId);
                $character->setAttribute('has_legacy_approval', $legacyMatch !== null);
                $character->setAttribute(
                    'is_first_submission',
                    (int) ($character->user?->submitted_characters_count ?? 0) === 1
                        && $character->guild_status !== 'draft'
                );
                $character->setAttribute('legacy_approval_match', $legacyMatch?->only([
                    'id',
                    'discord_name',
                    'player_name',
                    'room',
                    'tier',
                    'character_name',
                    'external_link',
                    'dndbeyond_character_id',
                    'source_row',
                    'source_column',
                ]));

                return $character;
            })
            ->values();
    }

    public function update(
        Request $request,
        Character $character,
        CharacterApprovalNotificationService $notificationService,
    ): RedirectResponse {
        $user = $request->user();
        abort_unless($user && $user->is_admin, 403);

        $data = $request->validate([
            'guild_status' => ['sometimes', 'required', 'in:pending,approved,declined,needs_changes'],
            'admin_notes' => ['nullable', 'string'],
            'review_note' => [
                'nullable',
                'string',
                'max:2000',
                Rule::requiredIf(fn () => in_array((string) $request->input('guild_status'), ['declined', 'needs_changes'], true)),
            ],
        ]);
        $statusChange = null;

        if (array_key_exists('guild_status', $data)) {
            if ($character->guild_status === $data['guild_status']) {
                return redirect()->back();
            }

            if ($character->guild_status === 'retired') {
                return redirect()->back()->withErrors([
                    'guild_status' => 'Retired characters cannot change status.',
                ]);
            }
            if ($character->guild_status === 'draft') {
                return redirect()->back()->withErrors([
                    'guild_status' => 'Draft characters must be submitted by their owner.',
                ]);
            }

            if (
                in_array($data['guild_status'], ['approved', 'declined', 'needs_changes'], true)
                && $character->guild_status !== 'pending'
            ) {
                return redirect()->back()->withErrors([
                    'guild_status' => 'Only pending characters can be reviewed. Move the character back to pending first.',
                ]);
            }

            $previousStatus = $character->guild_status;
            $character->guild_status = $data['guild_status'];
            if (in_array($data['guild_status'], ['declined', 'needs_changes'], true)) {
                $character->review_note = trim((string) ($data['review_note'] ?? ''));
            } else {
                $character->review_note = null;
            }
            AdminAuditLog::query()->create([
                'actor_user_id' => $user->id,
                'action' => 'character.guild_status.updated',
                'subject_type' => Character::class,
                'subject_id' => $character->id,
                'metadata' => [
                    'from' => $previousStatus,
                    'to' => $data['guild_status'],
                ],
            ]);
            $statusChange = $data['guild_status'];
        }

        if (array_key_exists('admin_notes', $data)) {
            $notes = is_string($data['admin_notes']) ? trim($data['admin_notes']) : null;
            $previousNotes = $character->admin_notes;
            $character->admin_notes = $notes !== '' ? $notes : null;
            AdminAuditLog::query()->create([
                'actor_user_id' => $user->id,
                'action' => 'character.admin_notes.updated',
                'subject_type' => Character::class,
                'subject_id' => $character->id,
                'metadata' => [
                    'had_notes' => $previousNotes !== null,
                    'has_notes' => $character->admin_notes !== null,
                ],
            ]);
        }

        $character->save();

        if ($statusChange) {
            $syncResult = $notificationService->syncAnnouncement($character);
            if (! $syncResult['ok'] && $syncResult['status'] !== 204) {
                Log::warning('Character approval announcement update failed.', [
                    'character_id' => $character->id,
                    'status' => $statusChange,
                    'error' => $syncResult['error'] ?? null,
                ]);
            }

            if (in_array($statusChange, ['approved', 'declined', 'needs_changes'], true)) {
                $result = $notificationService->notifyStatusChange($character, $statusChange, [
                    'reviewer_name' => $user->name,
                    'reviewer_discord_id' => $user->discord_id,
                ]);
                if (! $result['ok']) {
                    Log::warning('Character approval DM failed.', [
                        'character_id' => $character->id,
                        'status' => $statusChange,
                        'error' => $result['error'] ?? null,
                    ]);
                }
            }
        }

        return redirect()->back();
    }

    public function destroyUser(Request $request, User $user): RedirectResponse
    {
        $actor = $request->user();
        abort_unless($actor && $actor->is_admin, 403);

        $request->validate([
            'confirm' => ['required', 'string', 'in:DELETE'],
        ]);

        DB::transaction(function () use ($user, $actor) {
            $characters = Character::query()->where('user_id', $user->id);
            $characterCount = (clone $characters)->count();

            $characters->update([
                'guild_status' => DB::raw("case when guild_status = 'approved' then 'retired' else guild_status end"),
            ]);
            $characters->delete();

            $user->delete();

            AdminAuditLog::query()->create([
                'actor_user_id' => $actor->id,
                'action' => 'user.soft_deleted',
                'subject_type' => User::class,
                'subject_id' => $user->id,
                'metadata' => [
                    'user_name' => $user->name,
                    'character_count' => $characterCount,
                ],
            ]);
        });

        return redirect()->back();
    }
}
