<?php

use App\Http\Controllers\Monitoring\FrontendErrorController;
use Illuminate\Support\Facades\Route;

Route::post('/monitoring/frontend-errors', FrontendErrorController::class)
    ->middleware(['throttle:30,1'])
    ->name('monitoring.frontend-errors.store');
