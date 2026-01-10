<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Character;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
            ->with([
                'user:id,name,discord_id',
                'adventures:id,character_id,duration,has_additional_bubble',
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

        if (in_array($status, ['pending', 'approved', 'declined'], true)) {
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
                'guild_status',
                'admin_notes',
                'dm_bubbles',
                'bubble_shop_spend',
                'is_filler',
            ]);

        return Inertia::render('character-approvals/list', [
            'characters' => $characters,
        ]);
    }

    public function update(Request $request, Character $character): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $user->is_admin, 403);

        $data = $request->validate([
            'guild_status' => ['sometimes', 'required', 'in:pending,approved,declined'],
            'admin_notes' => ['nullable', 'string'],
        ]);

        if (array_key_exists('guild_status', $data)) {
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

        return redirect()->back();
    }
}
