<?php

use App\Http\Controllers\CharacterClass\CharacterClassController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::resource('character-classes', CharacterClassController::class)->only([
            'index',
            'store',
            'update',
            'destroy',
        ]);
    });
