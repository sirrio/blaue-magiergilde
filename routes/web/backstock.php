<?php

use App\Http\Controllers\Backstock\BackstockController;
use App\Http\Controllers\Backstock\BackstockItemController;
use App\Http\Controllers\Backstock\BackstockPostController;
use App\Http\Controllers\Backstock\BackstockSettingController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('backstock', [BackstockController::class, 'index'])
            ->name('backstock.index');

        Route::post('backstock/post', BackstockPostController::class)
            ->name('backstock.post');

        Route::patch('backstock/settings', BackstockSettingController::class)
            ->name('backstock-settings.update');

        Route::post('backstock/items', [BackstockItemController::class, 'store'])
            ->name('backstock-items.store');

        Route::delete('backstock/items/{backstockItem}', [BackstockItemController::class, 'destroy'])
            ->name('backstock-items.destroy');
    });
