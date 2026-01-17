<?php

use App\Http\Controllers\Spell\SpellController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::resource('spells', SpellController::class)->only([
            'index',
            'store',
            'update',
        ]);
    });
