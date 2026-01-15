<?php

namespace App\Http\Controllers\Bot;

use App\Http\Controllers\Controller;
use App\Models\DiscordBotSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DiscordBotSettingsController extends Controller
{
    public function ownerIds(Request $request): JsonResponse
    {
        $this->ensureBotToken($request);

        return response()->json([
            'owner_ids' => DiscordBotSetting::current()->owner_ids ?? [],
        ]);
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
