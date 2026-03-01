<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\PrivacyPolicyConsentController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\SocialAuthController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store']);

    Route::get('/register', [RegisteredUserController::class, 'create'])->name('register');
    Route::post('/register', [RegisteredUserController::class, 'store']);
});

Route::get('/auth/redirect', [SocialAuthController::class, 'redirectToProvider'])
    ->name('discord.login');

Route::get('/auth/callback', [SocialAuthController::class, 'handleProviderCallback'])
    ->name('discord.callback');

Route::middleware(['auth'])->group(function () {
    Route::get('/privacy-consent', [PrivacyPolicyConsentController::class, 'show'])
        ->name('privacy-consent.show');
    Route::post('/privacy-consent', [PrivacyPolicyConsentController::class, 'store'])
        ->name('privacy-consent.store');
});

Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware(['auth'])
    ->name('logout');
