<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Requests\Character\StoreCharacterRequest;
use App\Http\Requests\Character\UpdateCharacterRequest;
use App\Models\AdminAuditLog;
use App\Models\Character;
use App\Models\User;
use App\Services\CharacterApprovalNotificationService;
use App\Support\CharacterAvatarPrivacy;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class CharacterController extends Controller
{
    public function __construct(private readonly CharacterAvatarPrivacy $characterAvatarPrivacy) {}

    public function index(): Response
    {
        $user = Auth::user();

        $characters = Character::query()
            ->where('user_id', $user?->getAuthIdentifier())
            ->withTrashed()
            ->withCount('room')
            ->with('adventures')
            ->orderBy('position')
            ->get()
            ->withoutAppends();
        $this->attachReviewerNamesToCharacters($characters);
        $characters->each(fn (Character $character) => $this->characterAvatarPrivacy->maskLinkedCharacterAvatars(
            $character,
            $user?->getAuthIdentifier(),
        ));
        $guildCharacters = Character::query()
            ->without(['allies', 'downtimes', 'characterClasses'])
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
    ): RedirectResponse {
        $character = new Character;
        $character->name = $request->name;
        $character->faction = $request->faction;
        $character->notes = $request->notes;
        $character->is_filler = $request->is_filler;
        $character->version = $request->version;
        $character->dm_bubbles = $request->dm_bubbles;
        $character->dm_coins = $request->dm_coins;
        $character->bubble_shop_spend = $request->bubble_shop_spend;
        $character->user_id = Auth::user()->getAuthIdentifier();
        $character->start_tier = $request->start_tier;
        $character->external_link = $request->external_link;
        $character->guild_status = 'draft';
        if ($request->file('avatar')) {
            $character->avatar = $request->file('avatar')->store('avatars', 'public');
        }
        $character->save();

        $classIds = array_values(array_unique($request->class));
        $character->characterClasses()->sync($classIds);

        return to_route('characters.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(Character $character): Response
    {
        $this->ensureCharacterOwner($character);
        $character->load('adventures.allies.linkedCharacter');
        $this->attachReviewerNamesToCharacters(collect([$character]));
        $this->characterAvatarPrivacy->maskLinkedCharacterAvatars($character, Auth::id());

        $guildCharacters = Character::query()
            ->without(['allies', 'downtimes', 'characterClasses'])
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
    ): RedirectResponse {
        $this->ensureCharacterOwner($character);

        $previousStatus = $character->guild_status;
        $character->name = $request->name;
        $character->faction = $request->faction;
        $character->notes = $request->notes;
        $character->version = $request->version;
        $character->dm_bubbles = $request->dm_bubbles;
        $character->dm_coins = $request->dm_coins;
        $character->bubble_shop_spend = $request->bubble_shop_spend;
        $character->external_link = $request->external_link;
        if ($request->file('avatar')) {
            $character->avatar = $request->file('avatar')->store('avatars', 'public');
        }
        $character->save();

        $classIds = array_values(array_unique($request->class));
        $character->characterClasses()->sync($classIds);

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
    ): RedirectResponse {
        $this->ensureCharacterOwner($character);

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

        $character->adventures()->update([
            'deleted_by_character' => true,
        ]);
        $character->downtimes()->update([
            'deleted_by_character' => true,
        ]);

        $character->adventures()->delete();
        $character->downtimes()->delete();
        $character->delete();

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
}
