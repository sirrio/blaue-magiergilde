<?php

use App\Http\Controllers\GameAnnouncementController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::get('/games', [GameAnnouncementController::class, 'index'])->name('games.index');
    Route::get('/games/calendar', [GameAnnouncementController::class, 'calendar'])->name('games.calendar');
    Route::get('/games/archive', [GameAnnouncementController::class, 'archive'])->name('games.archive');
});
