<?php

use App\Http\Controllers\Compendium\CompendiumSuggestionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::post('/compendium/suggestions', [CompendiumSuggestionController::class, 'store'])
        ->name('compendium-suggestions.store');
});

Route::middleware(['auth', 'admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('/compendium-suggestions', [CompendiumSuggestionController::class, 'index'])
            ->name('compendium-suggestions.index');

        Route::patch('/compendium-suggestions/{compendiumSuggestion}/approve', [CompendiumSuggestionController::class, 'approve'])
            ->name('compendium-suggestions.approve');

        Route::patch('/compendium-suggestions/{compendiumSuggestion}/reject', [CompendiumSuggestionController::class, 'reject'])
            ->name('compendium-suggestions.reject');
    });
