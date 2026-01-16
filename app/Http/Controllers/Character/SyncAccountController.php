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
            if (! $currentUser || ! $currentUser->discord_id) {
                return redirect()->back()->with('error', 'Your Discord account is not connected yet.');
            }

            $alreadyLinked = User::query()
                ->where('discord_id', $currentUser->discord_id)
                ->where('id', '!=', $foundUser->id)
                ->exists();

            if ($alreadyLinked) {
                return redirect()->back()->with(
                    'error',
                    'A user is already linked to your Discord. Please contact an administrator.'
                );
            }

            $foundUser->discord_id = $currentUser->discord_id;
            $foundUser->avatar = $currentUser->avatar;
            try {
                $foundUser->save();
            } catch (\Throwable $error) {
                return redirect()->back()->with(
                    'error',
                    'A user is already linked to your Discord. Please contact an administrator.'
                );
            }

            Auth::logout();
            Auth::login($foundUser);

            $currentUser->delete();

            return to_route('characters.index');
        }

        return redirect()->back()->with('error', 'Invalid credentials.');
    }
}
