<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Character\SetQuickLevel;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SetCharacterQuickLevelRequest;
use App\Http\Requests\Admin\StoreCharacterForUserRequest;
use App\Http\Requests\Admin\UpdateCharacterForUserRequest;
use App\Models\AdminAuditLog;
use App\Models\Character;
use App\Models\User;
use App\Services\CharacterApprovalNotificationService;
use App\Support\CharacterAuditTrail;
use App\Support\CharacterProgressionState;
use App\Support\LevelProgression;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;

class CharacterManagementController extends Controller
{
    public function __construct(public SetQuickLevel $setQuickLevel) {}

    public function store(
        StoreCharacterForUserRequest $request,
        User $user,
        CharacterApprovalNotificationService $notificationService,
        CharacterAuditTrail $auditTrail,
        CharacterProgressionState $progressionState,
    ): RedirectResponse {
        $character = new Character;
        $character->name = $request->string('name')->toString();
        $character->faction = $request->input('faction', 'none');
        $character->notes = $this->cleanOptionalString($request->input('notes'));
        $character->is_filler = $request->boolean('is_filler');
        $character->version = $request->string('version')->toString();
        $character->user_id = $user->id;
        $character->start_tier = $request->string('start_tier')->toString();
        $character->external_link = $request->string('external_link')->toString();
        $character->guild_status = $request->input('guild_status', 'pending');
        $character->progression_version_id = LevelProgression::activeVersionId();
        $character->admin_managed = true;
        if ($request->file('avatar')) {
            $character->avatar = $request->file('avatar')->store('avatars', 'public');
        }
        $character->save();

        $classIds = array_values(array_unique($request->input('class', [])));
        $character->characterClasses()->sync($classIds);

        $startTierBonus = $progressionState->startTierBonus($character->start_tier);
        $auditTrail->record($character, 'character.created', delta: [
            'available_bubbles' => $startTierBonus,
            'bubbles' => $startTierBonus,
            'dm_bubbles' => $request->integer('dm_bubbles'),
            'dm_coins' => $request->integer('dm_coins'),
        ], metadata: [
            'admin_created' => true,
            'user_id' => $user->id,
            'name' => $character->name,
        ]);

        AdminAuditLog::query()->create([
            'actor_user_id' => $request->user()?->id,
            'action' => 'character.admin.created',
            'subject_type' => Character::class,
            'subject_id' => $character->id,
            'metadata' => [
                'user_id' => $user->id,
            ],
        ]);

        if ($character->guild_status === 'pending') {
            $result = $notificationService->syncAnnouncement($character);
            if (! $result['ok']) {
                Log::warning('Character approval channel notification failed.', [
                    'character_id' => $character->id,
                    'error' => $result['error'] ?? null,
                ]);
            }
        }

        return redirect()->back();
    }

    public function update(
        UpdateCharacterForUserRequest $request,
        Character $character,
        CharacterApprovalNotificationService $notificationService,
        CharacterAuditTrail $auditTrail,
        CharacterProgressionState $progressionState,
    ): RedirectResponse {
        $previousStatus = $character->guild_status;
        $snapshot = app(\App\Support\CharacterProgressionSnapshotResolver::class)->snapshot($character);
        $previous = [
            'name' => $character->name,
            'faction' => $character->faction,
            'notes' => $character->notes,
            'version' => $character->version,
            'start_tier' => $character->start_tier,
            'dm_bubbles' => (int) ($snapshot['dm_bubbles'] ?? 0),
            'dm_coins' => (int) ($snapshot['dm_coins'] ?? 0),
            'guild_status' => $character->guild_status,
            'external_link' => $character->external_link,
            'avatar' => $character->avatar,
            'is_filler' => (bool) $character->is_filler,
            'class_ids' => $this->sortedClassIds($character),
        ];
        $character->name = $request->string('name')->toString();
        $character->faction = $request->input('faction', 'none');
        $character->notes = $this->cleanOptionalString($request->input('notes'));
        $character->is_filler = $request->boolean('is_filler');
        $character->version = $request->string('version')->toString();
        $character->start_tier = $request->string('start_tier')->toString();
        $character->external_link = $request->string('external_link')->toString();
        if ($request->filled('guild_status') && in_array($previousStatus, ['pending', 'draft'], true)) {
            $character->guild_status = $request->string('guild_status')->toString();
        }
        $character->admin_managed = true;
        if ($request->file('avatar')) {
            $character->avatar = $request->file('avatar')->store('avatars', 'public');
        }
        $character->save();

        $classIds = array_values(array_unique($request->input('class', [])));
        sort($classIds);
        $character->characterClasses()->sync($classIds);
        $after = [
            'name' => $character->name,
            'faction' => $character->faction,
            'notes' => $character->notes,
            'version' => $character->version,
            'start_tier' => $character->start_tier,
            'dm_bubbles' => $request->integer('dm_bubbles'),
            'dm_coins' => $request->integer('dm_coins'),
            'guild_status' => $character->guild_status,
            'external_link' => $character->external_link,
            'avatar' => $character->avatar,
            'is_filler' => (bool) $character->is_filler,
            'class_ids' => $classIds,
        ];
        $changedFields = $this->changedFields($previous, $after);

        $this->recordCharacterUpdateAuditEvents(
            $auditTrail,
            $character,
            $previous,
            $after,
            $changedFields,
            ['admin_updated' => true],
            $progressionState,
        );

        AdminAuditLog::query()->create([
            'actor_user_id' => $request->user()?->id,
            'action' => 'character.admin.updated',
            'subject_type' => Character::class,
            'subject_id' => $character->id,
        ]);

        $shouldSyncAnnouncement = $character->approval_discord_channel_id && $character->approval_discord_message_id;
        if (! $shouldSyncAnnouncement && $character->guild_status === 'pending') {
            $shouldSyncAnnouncement = true;
        }

        if ($shouldSyncAnnouncement) {
            $result = $notificationService->syncAnnouncement($character);
            if (! $result['ok'] && $result['status'] !== 204) {
                Log::warning('Character approval announcement update failed.', [
                    'character_id' => $character->id,
                    'error' => $result['error'] ?? null,
                ]);
            }
        }

        return redirect()->back();
    }

    public function setQuickLevel(
        SetCharacterQuickLevelRequest $request,
        Character $character,
    ): RedirectResponse {
        $result = $this->setQuickLevel->handle($character, $request->integer('level'));

        if (! $result['ok']) {
            $minLevel = $result['minLevel'] ?? null;
            $message = $minLevel
                ? "Level cannot go below {$minLevel} with current adventure progress."
                : 'Unable to update level.';

            return redirect()->back()->withErrors(['level' => $message]);
        }

        $character->admin_managed = true;
        $character->save();

        AdminAuditLog::query()->create([
            'actor_user_id' => $request->user()?->id,
            'action' => 'character.admin.quick_level',
            'subject_type' => Character::class,
            'subject_id' => $character->id,
            'metadata' => [
                'level' => $request->integer('level'),
            ],
        ]);

        return redirect()->back();
    }

    private function cleanOptionalString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
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
     * @param  array<string, mixed>  $metadata
     */
    private function recordCharacterUpdateAuditEvents(
        CharacterAuditTrail $auditTrail,
        Character $character,
        array $before,
        array $after,
        array $changedFields,
        array $metadata = [],
        ?CharacterProgressionState $progressionState = null,
    ): void {
        foreach ($changedFields as $field) {
            $auditTrail->record($character, $this->characterUpdateAuditAction($field), delta: $this->characterUpdateDelta($field, $before, $after, $progressionState, $character), metadata: array_merge($metadata, [
                'field' => $field,
                'before' => [$field => $before[$field] ?? null],
                'after' => [$field => $after[$field] ?? null],
                'changed_fields' => [$field],
            ]));
        }
    }

    private function characterUpdateAuditAction(string $field): string
    {
        return match ($field) {
            'name' => 'character.name_updated',
            'faction' => 'character.faction_updated',
            'notes' => 'character.notes_updated',
            'version' => 'character.version_updated',
            'start_tier' => 'character.start_tier_updated',
            'dm_bubbles' => 'dm_bubbles.updated',
            'dm_coins' => 'dm_coins.updated',
            'guild_status' => 'character.guild_status_updated',
            'external_link' => 'character.external_link_updated',
            'avatar' => 'character.avatar_updated',
            'is_filler' => 'character.filler_updated',
            'class_ids' => 'character.classes_updated',
            default => 'character.updated',
        };
    }

    /**
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     * @return array<string, int>
     */
    private function characterUpdateDelta(string $field, array $before, array $after, ?CharacterProgressionState $progressionState, Character $character): array
    {
        return match ($field) {
            'dm_bubbles' => [
                'dm_bubbles' => (int) ($after[$field] ?? 0) - (int) ($before[$field] ?? 0),
                'bubbles' => (int) ($after[$field] ?? 0) - (int) ($before[$field] ?? 0),
            ],
            'dm_coins' => ['dm_coins' => (int) ($after[$field] ?? 0) - (int) ($before[$field] ?? 0)],
            'start_tier' => $this->startTierDelta($before, $after, $progressionState),
            default => [],
        };
    }

    /**
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     * @return array<string, int>
     */
    private function startTierDelta(array $before, array $after, ?CharacterProgressionState $progressionState): array
    {
        if ($progressionState === null) {
            return [];
        }

        $beforeBonus = $progressionState->startTierBonus($before['start_tier'] ?? null);
        $afterBonus = $progressionState->startTierBonus($after['start_tier'] ?? null);
        $diff = $afterBonus - $beforeBonus;

        if ($diff === 0) {
            return [];
        }

        return ['bubbles' => $diff];
    }
}
