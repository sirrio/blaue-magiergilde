<?php

use App\Http\Controllers\Game\GameController;
use Illuminate\Support\Facades\Route;

Route::resource('games', GameController::class)->only([
  'index',
  'store',
  'update',
  'destroy'
])->middleware(['auth']);
