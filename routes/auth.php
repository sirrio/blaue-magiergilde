<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\SocialAuthController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('/auth/redirect', [SocialAuthController::class, 'redirectToProvider'])
        ->name('discord.login');

    Route::get('/auth/callback', [SocialAuthController::class, 'handleProviderCallback'])
        ->name('discord.callback');
});


Route::middleware('auth')->group(function () {
    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');
});
