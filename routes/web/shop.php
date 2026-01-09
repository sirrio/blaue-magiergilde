<?php

use App\Http\Controllers\Shop\AddSpellToItemController;
use App\Http\Controllers\Shop\ShopController;
use App\Http\Controllers\Shop\ShopPostController;
use App\Http\Controllers\Shop\ShopSettingController;
use Illuminate\Support\Facades\Route;

Route::resource('shops', ShopController::class)->only([
    'index',
    'store',
])->middleware(['auth']);

Route::post('shops/{shop}/post', ShopPostController::class)
    ->middleware(['auth'])
    ->name('shops.post');

Route::patch('shops/settings', ShopSettingController::class)
    ->middleware(['auth'])
    ->name('shop-settings.update');

Route::post('shop-items/{shopItem}/add-spell', AddSpellToItemController::class)
    ->middleware(['auth'])
    ->name('shop-items.add-spell');
