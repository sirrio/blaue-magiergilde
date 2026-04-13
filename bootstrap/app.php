<?php

use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsurePrivacyPolicyAccepted;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SetUserLocale;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->encryptCookies(except: ['appearance']);
        $middleware->validateCsrfTokens(except: [
            'monitoring/frontend-errors',
            'monitoring/bot-errors',
        ]);

        $middleware->web(append: [
            HandleAppearance::class,
            SetUserLocale::class,
            EnsurePrivacyPolicyAccepted::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'admin' => EnsureAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Prevent sensitive fields from appearing in session flash data on errors.
        $exceptions->dontFlash([
            'password',
            'password_confirmation',
            'current_password',
        ]);
        // FrontendErrorReportedException and BotErrorReportedException are reported
        // via report() in their respective controllers. Each carries a context()
        // payload that Nightwatch picks up automatically through the exception handler.
        // No custom callbacks needed — the default pipeline handles them correctly.
    })->create();
