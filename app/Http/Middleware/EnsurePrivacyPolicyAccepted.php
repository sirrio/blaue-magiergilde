<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\Response;

class EnsurePrivacyPolicyAccepted
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! Route::has('privacy-consent.show')) {
            return $next($request);
        }

        $user = $request->user();
        if (! $user) {
            return $next($request);
        }

        $requiredVersion = (int) Config::get('legal.privacy_policy.version', 0);
        $acceptedVersion = (int) ($user->privacy_policy_accepted_version ?? 0);
        $acceptedAt = $user->privacy_policy_accepted_at;

        $hasAcceptedCurrentPolicy = $acceptedAt !== null && $acceptedVersion >= $requiredVersion;

        if ($hasAcceptedCurrentPolicy || $request->routeIs([
            'privacy-consent.show',
            'privacy-consent.store',
            'monitoring.frontend-errors.store',
            'logout',
            'datenschutz',
            'impressum',
        ])) {
            return $next($request);
        }

        if ($request->isMethod('GET')) {
            $request->session()->put('url.intended', $request->fullUrl());
        }

        return redirect()->route('privacy-consent.show');
    }
}
