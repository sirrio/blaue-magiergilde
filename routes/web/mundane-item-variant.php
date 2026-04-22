<?php

use App\Http\Controllers\MundaneItemVariant\MundaneItemVariantController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])
    ->get('/compendium/variants', [MundaneItemVariantController::class, 'index'])
    ->name('compendium.mundane-item-variants.index');

Route::middleware(['auth', 'admin'])
    ->get('/admin/mundane-item-variants', [MundaneItemVariantController::class, 'index'])
    ->name('admin.mundane-item-variants.index');

Route::middleware(['auth', 'admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::resource('mundane-item-variants', MundaneItemVariantController::class)->only([
            'store',
            'update',
            'destroy',
        ]);
    });
