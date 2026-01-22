<?php

use App\Http\Controllers\GameAnnouncementController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::get('/games', [GameAnnouncementController::class, 'index'])->name('games.index');
});
