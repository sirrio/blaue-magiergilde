<?php

use App\Http\Controllers\Spell\SpellController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])
    ->get('/compendium/spells', [SpellController::class, 'index'])
    ->name('compendium.spells.index');

Route::middleware(['auth', 'admin'])
    ->get('/admin/spells', fn () => redirect()->route('compendium.spells.index'))
    ->name('admin.spells.index');

Route::middleware(['auth', 'admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::resource('spells', SpellController::class)->only([
            'store',
            'update',
            'destroy',
        ]);
    });
