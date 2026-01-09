<?php

use App\Http\Controllers\Shop\AddSpellToItemController;
use App\Http\Controllers\Shop\ShopController;
use App\Http\Controllers\Shop\ShopPostController;
use Illuminate\Support\Facades\Route;

Route::resource('shops', ShopController::class)->only([
    'index',
    'store',
])->middleware(['auth']);

Route::post('shops/{shop}/post', ShopPostController::class)
    ->middleware(['auth'])
    ->name('shops.post');

Route::post('shop-items/{shopItem}/add-spell', AddSpellToItemController::class)
    ->middleware(['auth'])
    ->name('shop-items.add-spell');
