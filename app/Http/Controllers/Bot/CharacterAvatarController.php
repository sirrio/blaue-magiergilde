<?php

namespace App\Http\Controllers\Bot;

use App\Http\Controllers\Controller;
use App\Http\Requests\Bot\StoreCharacterAvatarRequest;
use App\Models\Character;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CharacterAvatarController extends Controller
{
    public function store(StoreCharacterAvatarRequest $request): JsonResponse
    {
        $this->ensureBotToken($request);

        $data = $request->validated();
        $character = Character::query()->findOrFail($data['character_id']);
        $avatarUrl = $data['avatar_url'];

        $response = Http::timeout(config('services.bot.http_timeout', 10))
            ->withHeaders(['User-Agent' => 'BlaueMagiergildeBot'])
            ->get($avatarUrl);

        if (! $response->successful()) {
            return response()->json(['error' => 'avatar_fetch_failed'], 422);
        }

        $contentType = strtolower((string) $response->header('Content-Type', ''));
        if (! str_starts_with($contentType, 'image/')) {
            return response()->json(['error' => 'avatar_not_image'], 422);
        }

        $body = $response->body();
        $maxBytes = 5 * 1024 * 1024;
        if (strlen($body) > $maxBytes) {
            return response()->json(['error' => 'avatar_too_large'], 422);
        }

        $extension = $this->extensionFromContentType($contentType)
            ?? pathinfo(parse_url($avatarUrl, PHP_URL_PATH) ?? '', PATHINFO_EXTENSION)
            ?? 'png';

        $extension = strtolower($extension);
        if (! in_array($extension, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
            $extension = 'png';
        }

        $path = 'avatars/discord/'.Str::uuid()->toString().'.'.$extension;
        Storage::disk('public')->put($path, $body);

        $previous = $character->avatar;
        if ($previous && ! str_starts_with($previous, 'http')) {
            Storage::disk('public')->delete($previous);
        }

        $character->avatar = $path;
        $character->save();

        return response()->json([
            'stored' => true,
            'avatar_path' => $path,
        ]);
    }

    private function extensionFromContentType(string $contentType): ?string
    {
        return match ($contentType) {
            'image/jpeg', 'image/jpg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            default => null,
        };
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
