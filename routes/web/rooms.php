<?php

use App\Http\Controllers\Admin\RoomController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('rooms', [RoomController::class, 'index'])->name('rooms.index');
        Route::post('rooms/maps', [RoomController::class, 'storeMap'])->name('rooms.maps.store');
        Route::patch('rooms/maps/{roomMap}', [RoomController::class, 'updateMap'])->name('rooms.maps.update');
        Route::post('rooms', [RoomController::class, 'store'])->name('rooms.store');
        Route::patch('rooms/{room}', [RoomController::class, 'update'])->name('rooms.update');
        Route::delete('rooms/{room}', [RoomController::class, 'destroy'])->name('rooms.destroy');
    });
