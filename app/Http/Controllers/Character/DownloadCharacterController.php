<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Resources\CharacterDownloadResource;
use App\Models\Character;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DownloadCharacterController extends Controller
{
    public function __invoke(Character $character): StreamedResponse
    {
        $userId = Auth::user()?->getAuthIdentifier();
        if (! $userId || $character->user_id !== $userId) {
            abort(403);
        }

        $character->loadMissing(['adventures', 'downtimes', 'allies', 'characterClasses']);

        $data = CharacterDownloadResource::make($character)->resolve();
        $fileName = 'character_'.$character->id.'.json';

        return response()->streamDownload(
            fn () => print (json_encode($data, JSON_PRETTY_PRINT)),
            $fileName,
            ['Content-Type' => 'application/json']
        );
    }
}
