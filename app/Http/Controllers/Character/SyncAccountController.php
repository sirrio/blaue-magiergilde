<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class SyncAccountController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $email = $request->email;
        $password = $request->password;

        $foundUser = User::where('email', $email)->first();

        if ($foundUser && Hash::check($password, $foundUser->password)) {
            $currentUser = Auth::user();
            $foundUser->discord_id = $currentUser->discord_id;
            $foundUser->avatar = $currentUser->avatar;
            $foundUser->save();

            Auth::logout();
            Auth::login($foundUser);

            $currentUser->delete();

            return to_route('characters.index');
        }

        return redirect()->back()->with('error', 'Invalid credentials.');
    }
}
