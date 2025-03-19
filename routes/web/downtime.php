<?php

use App\Http\Controllers\Downtime\DowntimeController;
use Illuminate\Support\Facades\Route;

Route::resource('downtimes', DowntimeController::class)->only([
  'store',
  'update',
  'destroy'
])->middleware(['auth']);
