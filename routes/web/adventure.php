<?php

use App\Http\Controllers\Adventure\AdventureController;
use Illuminate\Support\Facades\Route;

Route::resource('adventures', AdventureController::class)->only([
  'store',
  'update',
  'destroy'
])->middleware(['auth']);
