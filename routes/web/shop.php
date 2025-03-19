<?php

use App\Http\Controllers\Shop\ShopController;
use Illuminate\Support\Facades\Route;

Route::resource('shops', ShopController::class)->only([
  'index',
  'store',
])->middleware(['auth']);
