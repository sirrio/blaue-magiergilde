<?php

use App\Http\Controllers\User\BreakdownController;
use Illuminate\Support\Facades\Route;

Route::resource('breakdowns', BreakdownController::class)
    ->parameters(['breakdowns' => 'user'])
    ->only([
        'update',
    ])
    ->middleware(['auth']);
