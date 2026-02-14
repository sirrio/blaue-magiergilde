<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\AcceptPrivacyPolicyRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Config;
use Inertia\Inertia;
use Inertia\Response;

class PrivacyPolicyConsentController extends Controller
{
    public function show(): Response|RedirectResponse
    {
        $user = auth()->user();
        $requiredVersion = (int) Config::get('legal.privacy_policy.version', 0);

        if ($user && $user->privacy_policy_accepted_at !== null && (int) ($user->privacy_policy_accepted_version ?? 0) >= $requiredVersion) {
            return redirect()->route('characters.index');
        }

        return Inertia::render('privacy-consent', [
            'privacyPolicyVersion' => $requiredVersion,
            'privacyPolicyUpdatedNotice' => (string) Config::get('legal.privacy_policy.updated_notice', ''),
        ]);
    }

    public function store(AcceptPrivacyPolicyRequest $request): RedirectResponse
    {
        $request->user()->forceFill([
            'privacy_policy_accepted_at' => now(),
            'privacy_policy_accepted_version' => (int) Config::get('legal.privacy_policy.version', 0),
        ])->save();

        return redirect()->intended(route('characters.index'));
    }
}
