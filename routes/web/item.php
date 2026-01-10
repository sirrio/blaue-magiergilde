<?php

use App\Http\Controllers\Item\ItemController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::resource('items', ItemController::class)->only([
            'index',
            'store',
            'update',
        ]);
    });
