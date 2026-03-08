<?php

namespace App\Services;

use App\Models\Character;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class CharacterAvatarStorageService
{
    public function storeFromUrl(Character $character, string $avatarUrl, bool $persist = true): array
    {
        try {
            $response = Http::timeout($this->timeoutSeconds())
                ->withHeaders(['User-Agent' => 'BlaueMagiergildeBot'])
                ->get($avatarUrl);
        } catch (Throwable) {
            return ['ok' => false, 'error' => 'avatar_fetch_failed'];
        }

        if (! $response->successful()) {
            return ['ok' => false, 'error' => 'avatar_fetch_failed'];
        }

        $contentType = strtolower((string) $response->header('Content-Type', ''));
        if (! str_starts_with($contentType, 'image/')) {
            return ['ok' => false, 'error' => 'avatar_not_image'];
        }

        $body = $response->body();
        $maxBytes = 5 * 1024 * 1024;
        if (strlen($body) > $maxBytes) {
            return ['ok' => false, 'error' => 'avatar_too_large'];
        }

        $extension = $this->extensionFromContentType($contentType)
            ?? pathinfo(parse_url($avatarUrl, PHP_URL_PATH) ?? '', PATHINFO_EXTENSION)
            ?? 'png';

        $extension = strtolower($extension);
        if (! in_array($extension, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
            $extension = 'png';
        }

        $path = 'avatars/discord/'.Str::uuid()->toString().'.'.$extension;

        if (! $persist) {
            return [
                'ok' => true,
                'avatar_path' => $path,
                'persisted' => false,
            ];
        }

        Storage::disk('public')->put($path, $body);

        $previous = trim((string) $character->avatar);
        if ($previous !== '' && ! str_starts_with($previous, 'http://') && ! str_starts_with($previous, 'https://')) {
            Storage::disk('public')->delete($previous);
        }

        $character->avatar = $path;
        $character->save();

        return [
            'ok' => true,
            'avatar_path' => $path,
            'persisted' => true,
        ];
    }

    private function timeoutSeconds(): int
    {
        return max(1, (int) config('services.bot.http_timeout', 10));
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
}
