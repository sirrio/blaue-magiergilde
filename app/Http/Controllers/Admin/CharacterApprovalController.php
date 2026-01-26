<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Character;
use App\Models\User;
use App\Services\CharacterApprovalNotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class CharacterApprovalController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user && $user->is_admin, 403);

        $search = $request->string('search')->trim();
        $status = $request->input('status');
        $tier = $request->input('tier');
        $discordFilter = $request->input('discord');
        $noDiscord = $request->boolean('no_discord');

        $charactersQuery = Character::query()
            ->without(['allies', 'downtimes', 'characterClasses'])
            ->withCount('room')
            ->with([
                'user:id,name,discord_id,simplified_tracking',
                'adventures:id,character_id,duration,has_additional_bubble',
                'characterClasses:id,name',
            ]);

        if ($search->isNotEmpty()) {
            $charactersQuery->where(function ($query) use ($search) {
                $query->where('name', 'LIKE', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'LIKE', "%{$search}%")
                            ->orWhere('discord_id', 'LIKE', "%{$search}%");
                    });
            });
        }

        if (in_array($status, ['pending', 'approved', 'declined', 'retired', 'draft'], true)) {
            $charactersQuery->where('guild_status', $status);
        }

        if (in_array($tier, ['bt', 'lt', 'ht', 'et', 'filler'], true)) {
            $charactersQuery->where('start_tier', $tier);
        }

        if ($discordFilter === 'only') {
            $charactersQuery->whereHas('user', function ($query) {
                $query->whereNotNull('discord_id');
            });
        } elseif ($discordFilter === 'none' || $noDiscord) {
            $charactersQuery->whereHas('user', function ($query) {
                $query->whereNull('discord_id');
            });
        }

        $characters = $charactersQuery
            ->orderBy('user_id')
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'user_id',
                'external_link',
                'start_tier',
                'version',
                'faction',
                'guild_status',
                'notes',
                'admin_notes',
                'dm_bubbles',
                'dm_coins',
                'bubble_shop_spend',
                'is_filler',
                'admin_managed',
                'avatar',
            ]);

        return Inertia::render('character-approvals/list', [
            'characters' => $characters,
        ]);
    }

    public function update(
        Request $request,
        Character $character,
        CharacterApprovalNotificationService $notificationService,
    ): RedirectResponse {
        $user = $request->user();
        abort_unless($user && $user->is_admin, 403);

        $data = $request->validate([
            'guild_status' => ['sometimes', 'required', 'in:pending,approved,declined'],
            'admin_notes' => ['nullable', 'string'],
        ]);
        $statusChange = null;

        if (array_key_exists('guild_status', $data)) {
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
            $previousStatus = $character->guild_status;
            $character->guild_status = $data['guild_status'];
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

            if (in_array($statusChange, ['approved', 'declined'], true)) {
                $result = $notificationService->notifyStatusChange($character, $statusChange);
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
