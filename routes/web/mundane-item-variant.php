<?php

use App\Http\Controllers\MundaneItemVariant\MundaneItemVariantController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::resource('mundane-item-variants', MundaneItemVariantController::class)->only([
            'index',
            'store',
            'update',
            'destroy',
        ]);
    });
