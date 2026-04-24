<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Requests\Character\StoreCharacterRequest;
use App\Http\Requests\Character\UpdateCharacterRequest;
use App\Models\AdminAuditLog;
use App\Models\Character;
use App\Models\User;
use App\Services\CharacterApprovalNotificationService;
use App\Services\CharacterRetirementNotificationService;
use App\Support\CharacterAuditTrail;
use App\Support\CharacterAvatarPrivacy;
use App\Support\CharacterProgressionSnapshotResolver;
use App\Support\LevelProgression;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class CharacterController extends Controller
{
    public function __construct(
        private readonly CharacterAvatarPrivacy $characterAvatarPrivacy,
        private readonly CharacterProgressionSnapshotResolver $progressionSnapshots,
    ) {}

    public function index(): Response
    {
        $user = Auth::user();

        $characters = Character::query()
            ->where('user_id', $user?->getAuthIdentifier())
            ->withTrashed()
            ->withCount('room')
            ->with(['adventures', 'adventures.allies:id', 'bubbleShopPurchases'])
            ->orderBy('position')
            ->get()
            ->withoutAppends();
        $this->progressionSnapshots->attach($characters);
        $this->attachReviewerNamesToCharacters($characters);
        $characters->each(fn (Character $character) => $this->characterAvatarPrivacy->maskLinkedCharacterAvatars(
            $character,
            $user?->getAuthIdentifier(),
        ));
        $guildCharacters = Character::query()
            ->without(['allies', 'downtimes', 'characterClasses'])
            ->with('user:id,name,discord_username,discord_display_name')
            ->whereNull('deleted_at')
            ->whereIn('guild_status', $this->guildCharacterStatusesForAllies())
            ->orderBy('name')
            ->get(['id', 'name', 'avatar', 'guild_status', 'user_id', 'private_mode'])
            ->withoutAppends();
        $this->characterAvatarPrivacy->maskSelectableCharacters($guildCharacters, $user?->getAuthIdentifier());

        return Inertia::render('character/index', [
            'user' => $user,
            'characters' => $characters,
            'guildCharacters' => $guildCharacters,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create() {}

    /**
     * Store a newly created resource in storage.
     */
    public function store(
        StoreCharacterRequest $request,
        CharacterAuditTrail $auditTrail,
        \App\Support\CharacterProgressionState $progressionState,
    ): RedirectResponse {
        $character = new Character;
        $character->name = $request->name;
        $character->faction = $request->faction;
        $character->notes = $request->notes;
        $character->is_filler = $request->is_filler;
        $character->version = $request->version;
        $character->user_id = Auth::user()->getAuthIdentifier();
        $character->simplified_tracking = (bool) (Auth::user()?->simplified_tracking ?? false);
        $character->start_tier = $request->start_tier;
        $character->external_link = $request->external_link;
        $character->guild_status = 'draft';
        $character->progression_version_id = LevelProgression::activeVersionId();
        if ($request->file('avatar')) {
            $character->avatar = $request->file('avatar')->store('avatars', 'public');
        }
        $character->save();

        $classIds = array_values(array_unique($request->class));
        $character->characterClasses()->sync($classIds);

        $startTierBonus = $progressionState->startTierBonus($character->start_tier);
        $initialDmBubbles = $request->integer('dm_bubbles');
        $initialDmCoins = $request->integer('dm_coins');
        $auditTrail->record($character, 'character.created', delta: [
            'available_bubbles' => $startTierBonus,
            'bubbles' => $startTierBonus,
            'dm_bubbles' => $initialDmBubbles,
            'dm_coins' => $initialDmCoins,
        ], metadata: [
            'name' => $character->name,
        ]);

        return to_route('characters.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(Character $character): Response
    {
        $this->ensureCharacterOwner($character);
        $character->load('adventures.allies.linkedCharacter', 'bubbleShopPurchases', 'auditEvents.actor:id,name');
        $this->progressionSnapshots->attach($character);
        $this->attachReviewerNamesToCharacters(collect([$character]));
        $this->characterAvatarPrivacy->maskLinkedCharacterAvatars($character, Auth::id());

        $guildCharacters = Character::query()
            ->without(['allies', 'downtimes', 'characterClasses'])
            ->with('user:id,name,discord_username,discord_display_name')
            ->whereNull('deleted_at')
            ->whereIn('guild_status', $this->guildCharacterStatusesForAllies())
            ->orderBy('name')
            ->get(['id', 'name', 'avatar', 'guild_status', 'user_id', 'private_mode'])
            ->withoutAppends();
        $this->characterAvatarPrivacy->maskSelectableCharacters($guildCharacters, Auth::id());

        return Inertia::render('character/show', [
            'character' => $character,
            'guildCharacters' => $guildCharacters,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Character $character)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(
        UpdateCharacterRequest $request,
        Character $character,
        CharacterApprovalNotificationService $notificationService,
        CharacterAuditTrail $auditTrail,
    ): RedirectResponse {
        $this->ensureCharacterOwner($character);

        $previousStatus = $character->guild_status;
        $previousState = [
            'name' => $character->name,
            'faction' => $character->faction,
            'notes' => $character->notes,
            'version' => $character->version,
            'external_link' => $character->external_link,
            'avatar' => $character->avatar,
            'class_ids' => $this->sortedClassIds($character),
        ];
        $character->name = $request->name;
        $character->faction = $request->faction;
        $character->notes = $request->notes;
        $character->version = $request->version;
        $character->external_link = $request->external_link;
        if ($request->file('avatar')) {
            $character->avatar = $request->file('avatar')->store('avatars', 'public');
        }
        $character->save();

        $classIds = array_values(array_unique($request->class));
        sort($classIds);
        $character->characterClasses()->sync($classIds);
        $afterState = [
            'name' => $character->name,
            'faction' => $character->faction,
            'notes' => $character->notes,
            'version' => $character->version,
            'external_link' => $character->external_link,
            'avatar' => $character->avatar,
            'class_ids' => $classIds,
        ];
        $changedFields = $this->changedFields($previousState, $afterState);

        $this->recordCharacterUpdateAuditEvents($auditTrail, $character, $previousState, $afterState, $changedFields);

        $shouldSyncAnnouncement = $previousStatus !== $character->guild_status;
        if (! $shouldSyncAnnouncement && $character->guild_status === 'pending') {
            $shouldSyncAnnouncement = true;
        }

        if ($shouldSyncAnnouncement) {
            $result = $notificationService->syncAnnouncement($character);
            if (! $result['ok']) {
                Log::warning('Character approval channel notification failed.', [
                    'character_id' => $character->id,
                    'error' => $result['error'] ?? null,
                ]);
            }
        }

        return to_route('characters.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(
        Character $character,
        CharacterApprovalNotificationService $notificationService,
        CharacterRetirementNotificationService $retirementNotificationService,
        CharacterAuditTrail $auditTrail,
    ): RedirectResponse {
        $this->ensureCharacterOwner($character);
        $previousStatus = $character->guild_status;

        if ($character->approval_discord_channel_id && $character->approval_discord_message_id) {
            $result = $notificationService->removeAnnouncement($character);
            if (! $result['ok']) {
                Log::warning('Character approval channel removal failed.', [
                    'character_id' => $character->id,
                    'error' => $result['error'] ?? null,
                ]);
            } else {
                $deleted = (bool) ($result['deleted'] ?? false);
                if (! $deleted && ($result['status'] ?? null) === 'deleted') {
                    $deleted = true;
                }
                $noMessage = (int) ($result['status'] ?? 0) === 204;
                if ($deleted || $noMessage) {
                    $character->approval_discord_channel_id = null;
                    $character->approval_discord_message_id = null;
                }
            }
        }

        if ($character->guild_status === 'approved') {
            $character->guild_status = 'retired';
        }
        $character->save();
        if (in_array($previousStatus, ['pending', 'approved', 'needs_changes'], true)) {
            $result = $retirementNotificationService->notifyRetirement($character, [
                'previous_status' => $previousStatus,
            ]);

            if (! $result['ok']) {
                Log::warning('Character retirement notification failed.', [
                    'character_id' => $character->id,
                    'error' => $result['error'] ?? null,
                ]);
            }
        }

        $character->adventures()->update([
            'deleted_by_character' => true,
        ]);
        $character->downtimes()->update([
            'deleted_by_character' => true,
        ]);

        $character->adventures()->delete();
        $character->downtimes()->delete();
        $character->delete();
        $auditTrail->record($character, 'character.deleted', metadata: [
            'previous_status' => $previousStatus,
            'retired_instead_of_deleted' => $character->guild_status === 'retired',
        ]);

        return redirect()->back();
    }

    private function ensureCharacterOwner(Character $character): void
    {
        $userId = Auth::user()?->getAuthIdentifier();
        if (! $userId || $character->user_id !== $userId) {
            abort(403);
        }
    }

    private function isCharacterStatusSwitchEnabled(): bool
    {
        return (bool) Config::get('features.character_status_switch', true);
    }

    /**
     * @return list<string>
     */
    private function guildCharacterStatusesForAllies(): array
    {
        $statuses = ['pending', 'approved', 'needs_changes'];

        if (! $this->isCharacterStatusSwitchEnabled()) {
            $statuses[] = 'draft';
        }

        return $statuses;
    }

    private function attachReviewerNamesToCharacters(Collection $characters): void
    {
        $characterIds = $characters
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->filter(fn (int $id) => $id > 0)
            ->values()
            ->all();

        if ($characterIds === []) {
            return;
        }

        $reviewedStatuses = ['approved', 'declined', 'needs_changes'];
        $actorIdByCharacterId = [];

        $logs = AdminAuditLog::query()
            ->where('subject_type', Character::class)
            ->where('action', 'character.guild_status.updated')
            ->whereIn('subject_id', $characterIds)
            ->orderByDesc('id')
            ->get(['subject_id', 'actor_user_id', 'metadata']);

        foreach ($logs as $log) {
            $subjectId = (int) $log->subject_id;
            if (isset($actorIdByCharacterId[$subjectId])) {
                continue;
            }

            $toStatus = strtolower(trim((string) data_get($log->metadata, 'to', '')));
            if (! in_array($toStatus, $reviewedStatuses, true)) {
                continue;
            }

            $actorUserId = (int) $log->actor_user_id;
            if ($actorUserId <= 0) {
                continue;
            }

            $actorIdByCharacterId[$subjectId] = $actorUserId;
        }

        $actorIds = collect($actorIdByCharacterId)
            ->values()
            ->unique()
            ->values()
            ->all();

        $reviewerNames = User::query()
            ->whereIn('id', $actorIds)
            ->pluck('name', 'id');

        foreach ($characters as $character) {
            $actorId = $actorIdByCharacterId[(int) $character->id] ?? null;
            $reviewedByName = $actorId ? $reviewerNames->get($actorId) : null;
            $character->setAttribute('reviewed_by_name', $reviewedByName);
        }
    }

    /**
     * @return list<int>
     */
    private function sortedClassIds(Character $character): array
    {
        return $character->characterClasses()
            ->pluck('character_classes.id')
            ->map(fn ($id): int => (int) $id)
            ->sort()
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     * @return list<string>
     */
    private function changedFields(array $before, array $after): array
    {
        return collect(array_keys($after))
            ->filter(fn (string $key): bool => ($before[$key] ?? null) !== $after[$key])
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     * @param  list<string>  $changedFields
     */
    private function recordCharacterUpdateAuditEvents(CharacterAuditTrail $auditTrail, Character $character, array $before, array $after, array $changedFields): void
    {
        foreach ($changedFields as $field) {
            $auditTrail->record($character, $this->characterUpdateAuditAction($field), delta: $this->characterUpdateDelta($field, $before, $after), metadata: [
                'field' => $field,
                'before' => [$field => $before[$field] ?? null],
                'after' => [$field => $after[$field] ?? null],
                'changed_fields' => [$field],
            ]);
        }
    }

    private function characterUpdateAuditAction(string $field): string
    {
        return match ($field) {
            'name' => 'character.name_updated',
            'faction' => 'character.faction_updated',
            'notes' => 'character.notes_updated',
            'version' => 'character.version_updated',
            'external_link' => 'character.external_link_updated',
            'avatar' => 'character.avatar_updated',
            'class_ids' => 'character.classes_updated',
            default => 'character.updated',
        };
    }

    /**
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     * @return array<string, int>
     */
    private function characterUpdateDelta(string $field, array $before, array $after): array
    {
        return [];
    }
}
