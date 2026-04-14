<?php

use App\Http\Controllers\Monitoring\BotErrorController;
use App\Http\Controllers\Monitoring\FrontendErrorController;
use Illuminate\Support\Facades\Route;

Route::post('/monitoring/frontend-errors', FrontendErrorController::class)
    ->middleware(['throttle:30,1'])
    ->name('monitoring.frontend-errors.store');

Route::post('/monitoring/bot-errors', BotErrorController::class)
    ->middleware(['throttle:60,1'])
    ->name('monitoring.bot-errors.store');
