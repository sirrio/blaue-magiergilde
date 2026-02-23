<?php

use App\Http\Controllers\Item\ItemController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])
    ->get('/compendium/items', [ItemController::class, 'index'])
    ->name('compendium.items.index');

Route::middleware(['auth', 'admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::resource('items', ItemController::class)->only([
            'index',
            'store',
            'update',
            'destroy',
        ]);
    });
