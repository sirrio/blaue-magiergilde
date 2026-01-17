<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Requests\Character\SortCharacterRequest;
use App\Models\Character;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;

class SortCharacterController extends Controller
{
    public function __invoke(SortCharacterRequest $request): RedirectResponse
    {
        $userId = Auth::user()?->getAuthIdentifier();
        if (! $userId) {
            abort(403);
        }

        $list = $request->list;
        foreach ($list as $key => $value) {
            $char = Character::query()
                ->where('user_id', $userId)
                ->find($value['id']);
            if (! $char) {
                abort(403);
            }
            $char->position = $key;
            $char->save();
        }

        return redirect()->back();
    }
}
