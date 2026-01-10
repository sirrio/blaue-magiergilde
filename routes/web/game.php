<?php

use App\Http\Controllers\Game\GameController;
use Illuminate\Support\Facades\Route;

Route::resource('game-master-log', GameController::class)
    ->only([
        'index',
        'store',
        'update',
        'destroy',
    ])
    ->middleware(['auth'])
    ->names([
        'index' => 'game-master-log.index',
        'store' => 'game-master-log.store',
        'update' => 'game-master-log.update',
        'destroy' => 'game-master-log.destroy',
    ]);
