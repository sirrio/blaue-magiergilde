<?php

use App\Http\Controllers\Item\ItemController;
use Illuminate\Support\Facades\Route;

Route::resource('items', ItemController::class)->only([
    'index',
    'store',
    'update',
])->middleware(['auth']);
