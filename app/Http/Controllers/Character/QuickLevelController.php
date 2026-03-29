<?php

namespace App\Http\Controllers\Character;

use App\Actions\Character\SetQuickLevel;
use App\Http\Controllers\Controller;
use App\Http\Requests\Character\SetQuickLevelRequest;
use App\Models\Character;
use Illuminate\Http\RedirectResponse;

class QuickLevelController extends Controller
{
    public function __construct(public SetQuickLevel $setQuickLevel) {}

    public function store(SetQuickLevelRequest $request, Character $character): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $character->user_id === $user->id, 403);

        if (! ($character->simplified_tracking ?? false)) {
            return redirect()->back()->withErrors([
                'level' => 'Level tracking must be enabled to set a level.',
            ]);
        }

        $result = $this->setQuickLevel->handle($character, $request->integer('level'));

        if (! $result['ok']) {
            $minLevel = $result['minLevel'] ?? null;
            $message = $minLevel
                ? "Level cannot go below {$minLevel} with current adventure progress."
                : 'Unable to update level.';

            return redirect()->back()->withErrors(['level' => $message]);
        }

        return redirect()->back();
    }
}
