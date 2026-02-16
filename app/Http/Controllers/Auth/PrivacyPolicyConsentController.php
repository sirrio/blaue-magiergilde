<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\AcceptPrivacyPolicyRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Str;
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

        $intendedUrl = $request->session()->pull('url.intended');

        if ($this->canUseIntendedUrlAfterConsent($request, $intendedUrl)) {
            return redirect()->to($intendedUrl);
        }

        return redirect()->route('characters.index');
    }

    private function canUseIntendedUrlAfterConsent(AcceptPrivacyPolicyRequest $request, mixed $intendedUrl): bool
    {
        if (! is_string($intendedUrl) || $intendedUrl === '') {
            return false;
        }

        $intendedHost = parse_url($intendedUrl, PHP_URL_HOST);
        if (is_string($intendedHost) && ! hash_equals($request->getHost(), $intendedHost)) {
            return false;
        }

        $intendedPath = (string) (parse_url($intendedUrl, PHP_URL_PATH) ?? '/');
        $normalizedPath = '/'.trim($intendedPath, '/');

        if (in_array($normalizedPath, [
            '/privacy-consent',
            '/auth/callback',
            '/auth/redirect',
            '/login',
            '/register',
            '/logout',
        ], true)) {
            return false;
        }

        return ! Str::startsWith($normalizedPath, '/auth/');
    }
}
