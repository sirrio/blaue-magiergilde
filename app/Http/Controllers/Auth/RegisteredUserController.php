<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class RegisteredUserController extends Controller
{
    public function create()
    {
        return Inertia::render('register', [
            'privacyPolicyVersion' => (int) Config::get('legal.privacy_policy.version', 0),
            'privacyPolicyUpdatedNotice' => (string) Config::get('legal.privacy_policy.updated_notice', ''),
        ]);
    }

    public function store(RegisterRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'privacy_policy_accepted_at' => now(),
            'privacy_policy_accepted_version' => (int) Config::get('legal.privacy_policy.version', 0),
        ]);

        auth()->login($user);

        return redirect()->route('characters.index');
    }
}
