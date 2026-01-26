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
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;

class CharacterManagementController extends Controller
{
    public function __construct(public SetQuickLevel $setQuickLevel) {}

    public function store(
        StoreCharacterForUserRequest $request,
        User $user,
        CharacterApprovalNotificationService $notificationService,
    ): RedirectResponse {
        $character = new Character;
        $character->name = $request->string('name')->toString();
        $character->faction = $request->input('faction', 'none');
        $character->notes = $this->cleanOptionalString($request->input('notes'));
        $character->is_filler = $request->boolean('is_filler');
        $character->version = $request->string('version')->toString();
        $character->dm_bubbles = $request->integer('dm_bubbles');
        $character->dm_coins = $request->integer('dm_coins');
        $character->bubble_shop_spend = $request->integer('bubble_shop_spend');
        $character->user_id = $user->id;
        $character->start_tier = $request->string('start_tier')->toString();
        $character->external_link = $request->string('external_link')->toString();
        $character->guild_status = $request->input('guild_status', 'pending');
        $character->admin_managed = true;
        if ($request->file('avatar')) {
            $character->avatar = $request->file('avatar')->store('avatars', 'public');
        }
        $character->save();

        $classIds = array_values(array_unique($request->input('class', [])));
        $character->characterClasses()->sync($classIds);

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
    ): RedirectResponse {
        $previousStatus = $character->guild_status;

        $character->name = $request->string('name')->toString();
        $character->faction = $request->input('faction', 'none');
        $character->notes = $this->cleanOptionalString($request->input('notes'));
        $character->is_filler = $request->boolean('is_filler');
        $character->version = $request->string('version')->toString();
        $character->dm_bubbles = $request->integer('dm_bubbles');
        $character->dm_coins = $request->integer('dm_coins');
        $character->bubble_shop_spend = $request->integer('bubble_shop_spend');
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
        $character->characterClasses()->sync($classIds);

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
}
