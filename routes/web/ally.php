<?php

use App\Http\Controllers\Ally\AllyController;
use Illuminate\Support\Facades\Route;

Route::resource('allies', AllyController::class)->only([
  'store',
  'destroy'
])->middleware(['auth']);
