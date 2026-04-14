<?php

use App\Http\Controllers\CharacterClass\CharacterClassController;
use App\Http\Controllers\CharacterClass\CharacterSubclassController;
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

        Route::prefix('character-classes/{character_class}')
            ->name('character-subclasses.')
            ->group(function () {
                Route::post('subclasses', [CharacterSubclassController::class, 'store'])->name('store');
                Route::put('subclasses/{subclass}', [CharacterSubclassController::class, 'update'])->name('update');
                Route::delete('subclasses/{subclass}', [CharacterSubclassController::class, 'destroy'])->name('destroy');
            });
    });
