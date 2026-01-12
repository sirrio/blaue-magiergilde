<?php

use App\Http\Controllers\Shop\AddSpellToItemController;
use App\Http\Controllers\Shop\ShopController;
use App\Http\Controllers\Shop\ShopPostController;
use App\Http\Controllers\Shop\ShopUpdatePostController;
use App\Http\Controllers\Shop\ShopSettingController;
use App\Http\Controllers\Shop\RefreshShopItemSnapshotController;
use App\Http\Controllers\Shop\UpdateShopItemSnapshotController;
use App\Http\Controllers\Shop\UpdateShopItemNoteController;
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

        Route::post('shops/{shop}/update-post', ShopUpdatePostController::class)
            ->name('shops.update-post');

        Route::patch('shops/settings', ShopSettingController::class)
            ->name('shop-settings.update');

        Route::post('shop-items/{shopItem}/add-spell', AddSpellToItemController::class)
            ->name('shop-items.add-spell');

        Route::patch('shop-items/{shopItem}/notes', UpdateShopItemNoteController::class)
            ->name('shop-items.notes.update');

        Route::patch('shop-items/{shopItem}/snapshot', UpdateShopItemSnapshotController::class)
            ->name('shop-items.snapshot.update');

        Route::post('shop-items/{shopItem}/snapshot/refresh', RefreshShopItemSnapshotController::class)
            ->name('shop-items.snapshot.refresh');
    });
