<?php

use App\Http\Controllers\User\BreakdownController;
use App\Http\Controllers\User\UserController;
use Illuminate\Support\Facades\Route;

Route::resource('user', UserController::class)->only([
  'destroy'
])->middleware(['auth']);

Route::resource('breakdowns', BreakdownController::class)->only([
  'update'
])->middleware(['auth']);
