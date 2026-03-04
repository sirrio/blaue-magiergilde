<?php

namespace App\Http\Controllers\Bot;

use App\Http\Controllers\Controller;
use App\Http\Requests\Bot\DeleteDiscordLinkedAccountRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BotAccountController extends Controller
{
    public function destroy(DeleteDiscordLinkedAccountRequest $request): JsonResponse
    {
        $this->ensureBotToken($request);

        $data = $request->validated();

        $user = User::query()
            ->where('discord_id', $data['actor_discord_id'])
            ->first();

        if (! $user) {
            return response()->json(['error' => 'Linked account not found.'], 404);
        }

        $user->delete();

        return response()->json(['status' => 'deleted']);
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
