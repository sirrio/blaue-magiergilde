<?php

use App\Http\Controllers\Bot\BotOperationStatusController;
use App\Http\Controllers\Shop\AddSpellToItemController;
use App\Http\Controllers\Shop\RefreshShopItemSnapshotController;
use App\Http\Controllers\Shop\RemoveSpellFromItemController;
use App\Http\Controllers\Shop\RerollShopItemController;
use App\Http\Controllers\Shop\ShopController;
use App\Http\Controllers\Shop\ShopPostController;
use App\Http\Controllers\Shop\ShopSettingController;
use App\Http\Controllers\Shop\ShopUpdatePostController;
use App\Http\Controllers\Shop\UpdateShopItemSnapshotController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::resource('shops', ShopController::class)->only([
            'index',
            'store',
        ]);

        Route::post('shops/publish-draft', ShopPostController::class)
            ->name('shops.post');

        Route::post('shops/update-post', ShopUpdatePostController::class)
            ->name('shops.update-post');

        Route::get('bot-operations/{botOperation}', BotOperationStatusController::class)
            ->name('bot-operations.show');

        Route::patch('shops/settings', ShopSettingController::class)
            ->name('shop-settings.update');

        Route::post('shop-items/{shopItem}/add-spell', AddSpellToItemController::class)
            ->name('shop-items.add-spell');

        Route::post('shop-items/{shopItem}/reroll', RerollShopItemController::class)
            ->name('shop-items.reroll');

        Route::delete('shop-items/{shopItem}/spell', RemoveSpellFromItemController::class)
            ->name('shop-items.spell.destroy');

        Route::patch('shop-items/{shopItem}/snapshot', UpdateShopItemSnapshotController::class)
            ->name('shop-items.snapshot.update');

        Route::post('shop-items/{shopItem}/snapshot/refresh', RefreshShopItemSnapshotController::class)
            ->name('shop-items.snapshot.refresh');
    });
