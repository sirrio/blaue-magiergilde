<?php

use App\Http\Controllers\GameAnnouncementController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::get('/games', [GameAnnouncementController::class, 'index'])->name('games.index');
});

Route::middleware(['auth', 'admin'])->group(function () {
    Route::post('/games/sync', [GameAnnouncementController::class, 'sync'])->name('games.sync');
});
