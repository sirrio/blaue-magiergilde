<?php

use App\Http\Controllers\Shop\AddSpellToItemController;
use App\Http\Controllers\Shop\ShopController;
use App\Http\Controllers\Shop\ShopPostController;
use App\Http\Controllers\Shop\ShopSettingController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::resource('shops', ShopController::class)->only([
            'index',
            'store',
        ]);

        Route::post('shops/{shop}/post', ShopPostController::class)
            ->name('shops.post');

        Route::patch('shops/settings', ShopSettingController::class)
            ->name('shop-settings.update');

        Route::post('shop-items/{shopItem}/add-spell', AddSpellToItemController::class)
            ->name('shop-items.add-spell');
    });
