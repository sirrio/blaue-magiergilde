<?php

namespace App\Http\Controllers\RegisteredCharacter;

use App\Http\Controllers\Controller;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredCharacterController extends Controller
{
    public function index(): Response
    {
        $users = User::query()
            ->with(['registeredCharacters' => function ($query) {
                $query->select(['id', 'user_id', 'name', 'tier', 'url']);
            }])
            ->select(['id', 'name'])
            ->orderBy('name')
            ->get();

        return Inertia::render('registered-character/index', [
            'users' => $users,
        ]);
    }
}
