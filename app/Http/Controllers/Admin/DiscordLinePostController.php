<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PostDiscordLinesRequest;
use App\Services\DiscordLinePostService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;

class DiscordLinePostController extends Controller
{
    public function __invoke(PostDiscordLinesRequest $request, DiscordLinePostService $discordLinePostService): RedirectResponse
    {
        $result = $discordLinePostService->post(
            $request->string('channel_id')->toString(),
            $request->preparedLines(),
        );

        if (! ($result['ok'] ?? false)) {
            throw ValidationException::withMessages([
                'discord_line_post' => $result['error'] ?? 'Die Zeilen konnten nicht an Discord gesendet werden.',
            ]);
        }

        return redirect()->back();
    }
}
