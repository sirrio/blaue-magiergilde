<?php

namespace App\Http\Controllers\Bot;

use App\Http\Controllers\Controller;
use App\Http\Requests\Bot\StoreCharacterAvatarRequest;
use App\Models\Character;
use App\Services\CharacterAvatarStorageService;
use Illuminate\Http\JsonResponse;

class CharacterAvatarController extends Controller
{
    public function __construct(private readonly CharacterAvatarStorageService $avatarStorageService) {}

    public function store(StoreCharacterAvatarRequest $request): JsonResponse
    {
        $this->ensureBotToken($request);

        $data = $request->validated();
        $character = Character::query()->findOrFail($data['character_id']);
        $avatarUrl = $data['avatar_url'];
        $stored = $this->avatarStorageService->storeFromUrl($character, $avatarUrl);
        if (! ($stored['ok'] ?? false)) {
            return response()->json(['error' => $stored['error'] ?? 'avatar_fetch_failed'], 422);
        }

        return response()->json([
            'stored' => true,
            'avatar_path' => $stored['avatar_path'] ?? null,
        ]);
    }

    private function ensureBotToken(StoreCharacterAvatarRequest $request): void
    {
        $token = trim((string) config('services.bot.http_token', ''));
        if ($token === '') {
            abort(500, 'Bot token missing.');
        }

        $provided = (string) $request->header('X-Bot-Token', '');
        abort_unless($provided !== '' && hash_equals($token, $provided), 401);
    }
}
