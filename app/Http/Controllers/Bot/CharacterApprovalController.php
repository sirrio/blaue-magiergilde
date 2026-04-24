<?php

namespace App\Http\Controllers\Bot;

use App\Http\Controllers\Controller;
use App\Http\Requests\Bot\SyncCharacterApprovalRequest;
use App\Http\Requests\Bot\UpdateCharacterApprovalStatusRequest;
use App\Models\AdminAuditLog;
use App\Models\Character;
use App\Models\User;
use App\Services\CharacterApprovalNotificationService;
use App\Support\CharacterAuditTrail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CharacterApprovalController extends Controller
{
    public function updateStatus(
        UpdateCharacterApprovalStatusRequest $request,
        CharacterApprovalNotificationService $notificationService,
        CharacterAuditTrail $auditTrail,
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

        $isReviewDecision = in_array($data['status'], ['approved', 'declined', 'needs_changes'], true);
        if ($isReviewDecision && $character->guild_status !== 'pending') {
            return response()->json(['error' => 'Only pending characters can be reviewed. Move the character back to pending first.'], 409);
        }

        if (
            $data['status'] === 'pending'
            && ! in_array($character->guild_status, ['approved', 'declined', 'needs_changes'], true)
        ) {
            return response()->json(['error' => 'Only reviewed characters can be moved back into review.'], 409);
        }

        $previousStatus = $character->guild_status;
        $previousReviewNote = $character->review_note;
        $character->guild_status = $data['status'];
        if (in_array($data['status'], ['declined', 'needs_changes'], true)) {
            $character->review_note = trim((string) ($data['review_note'] ?? ''));
        } else {
            $character->review_note = null;
        }
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

        $auditTrail->record($character, 'character.guild_status_updated', metadata: [
            'field' => 'guild_status',
            'before' => ['guild_status' => $previousStatus],
            'after' => ['guild_status' => $character->guild_status],
            'changed_fields' => ['guild_status'],
            'via' => 'discord-bot',
        ], actorUserId: $actor->id);

        if ($previousReviewNote !== $character->review_note) {
            $auditTrail->record($character, 'character.review_note_updated', metadata: [
                'field' => 'review_note',
                'before' => ['review_note' => $previousReviewNote],
                'after' => ['review_note' => $character->review_note],
                'changed_fields' => ['review_note'],
                'via' => 'discord-bot',
            ], actorUserId: $actor->id);
        }

        $syncResult = $notificationService->syncAnnouncement($character);
        if (! $syncResult['ok']) {
            Log::warning('Character approval announcement update failed.', [
                'character_id' => $character->id,
                'status' => $data['status'],
                'error' => $syncResult['error'] ?? null,
            ]);
        }

        if (in_array($data['status'], ['approved', 'declined', 'needs_changes'], true)) {
            $result = $notificationService->notifyStatusChange($character, $data['status'], [
                'reviewer_name' => $actor->name,
                'reviewer_discord_id' => $actor->discord_id,
            ]);
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

    public function sync(
        SyncCharacterApprovalRequest $request,
        CharacterApprovalNotificationService $notificationService,
    ): JsonResponse {
        $this->ensureBotToken($request);

        $data = $request->validated();
        $character = Character::withTrashed()->find($data['character_id']);
        if (! $character) {
            return response()->json(['error' => 'Character not found.'], 404);
        }

        if ($character->trashed()) {
            $result = $notificationService->removeAnnouncement($character);
            if (! $result['ok']) {
                Log::warning('Character approval announcement removal failed.', [
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
                    $character->save();
                }
            }

            return response()->json(['status' => 'deleted']);
        }

        $syncResult = $notificationService->syncAnnouncement($character);
        if (! $syncResult['ok']) {
            Log::warning('Character approval announcement sync failed.', [
                'character_id' => $character->id,
                'error' => $syncResult['error'] ?? null,
            ]);
        }

        return response()->json(['status' => 'synced']);
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
