<?php

namespace App\Http\Controllers\Bot;

use App\Http\Controllers\Controller;
use App\Http\Requests\Bot\UpdateCharacterApprovalStatusRequest;
use App\Models\AdminAuditLog;
use App\Models\Character;
use App\Models\User;
use App\Services\CharacterApprovalNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CharacterApprovalController extends Controller
{
    public function updateStatus(
        UpdateCharacterApprovalStatusRequest $request,
        CharacterApprovalNotificationService $notificationService,
    ): JsonResponse {
        $this->ensureBotToken($request);

        $data = $request->validated();

        $actor = User::query()->where('discord_id', $data['actor_discord_id'])->first();
        if (! $actor || ! $actor->is_admin) {
            return response()->json(['error' => 'Actor not authorized.'], 403);
        }

        $character = Character::query()->find($data['character_id']);
        if (! $character) {
            return response()->json(['error' => 'Character not found.'], 404);
        }

        if ($character->guild_status === 'retired') {
            return response()->json(['error' => 'Retired characters cannot change status.'], 422);
        }

        if ($character->guild_status === 'draft') {
            return response()->json(['error' => 'Draft characters must be submitted by their owner.'], 422);
        }

        if ($character->guild_status === $data['status']) {
            return response()->json(['status' => 'noop']);
        }

        if ($character->guild_status !== 'pending') {
            return response()->json(['error' => 'Character is not pending.'], 409);
        }

        $previousStatus = $character->guild_status;
        $character->guild_status = $data['status'];
        $character->save();

        AdminAuditLog::query()->create([
            'actor_user_id' => $actor->id,
            'action' => 'character.guild_status.updated',
            'subject_type' => Character::class,
            'subject_id' => $character->id,
            'metadata' => [
                'from' => $previousStatus,
                'to' => $data['status'],
                'via' => 'discord-bot',
            ],
        ]);

        $syncResult = $notificationService->syncAnnouncement($character);
        if (! $syncResult['ok']) {
            Log::warning('Character approval announcement update failed.', [
                'character_id' => $character->id,
                'status' => $data['status'],
                'error' => $syncResult['error'] ?? null,
            ]);
        }

        if (in_array($data['status'], ['approved', 'declined'], true)) {
            $result = $notificationService->notifyStatusChange($character, $data['status']);
            if (! $result['ok']) {
                Log::warning('Character approval DM failed.', [
                    'character_id' => $character->id,
                    'status' => $data['status'],
                    'error' => $result['error'] ?? null,
                ]);
            }
        }

        return response()->json(['status' => 'updated']);
    }

    private function ensureBotToken(Request $request): void
    {
        $token = trim((string) config('services.bot.http_token', ''));
        if ($token === '') {
            abort(500, 'Bot token missing.');
        }

        $provided = (string) $request->header('X-Bot-Token', '');
        abort_unless($provided !== '' && hash_equals($token, $provided), 401);
    }
}
