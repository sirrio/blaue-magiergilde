<?php

use App\Http\Controllers\Admin\RoomController as AdminRoomController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\RoomAssetLibraryController;
use App\Http\Controllers\RoomAssetController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])
    ->group(function () {
        Route::get('rooms', [RoomController::class, 'index'])->name('rooms.index');
        Route::post('rooms/{room}/assets', [RoomAssetController::class, 'store'])->name('rooms.assets.store');
        Route::post('rooms/{room}/assets/library', [RoomAssetController::class, 'storeFromLibrary'])->name('rooms.assets.library.store');
        Route::patch('room-assets/{roomAsset}', [RoomAssetController::class, 'update'])->name('rooms.assets.update');
        Route::delete('room-assets/{roomAsset}', [RoomAssetController::class, 'destroy'])->name('rooms.assets.destroy');
        Route::get('rooms/assets/library', [RoomAssetLibraryController::class, 'index'])->name('rooms.assets.library.index');
        Route::get('rooms/assets/library/asset', [RoomAssetLibraryController::class, 'show'])->name('rooms.assets.library.show');
    });

Route::middleware(['auth'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('manage-rooms', [AdminRoomController::class, 'index'])->name('rooms.index');
        Route::post('manage-rooms/maps', [AdminRoomController::class, 'storeMap'])->name('rooms.maps.store');
        Route::patch('manage-rooms/maps/{roomMap}', [AdminRoomController::class, 'updateMap'])->name('rooms.maps.update');
        Route::post('manage-rooms', [AdminRoomController::class, 'store'])->name('rooms.store');
        Route::patch('manage-rooms/{room}', [AdminRoomController::class, 'update'])->name('rooms.update');
        Route::delete('manage-rooms/{room}', [AdminRoomController::class, 'destroy'])->name('rooms.destroy');
        Route::delete('manage-rooms/{room}/assets', [AdminRoomController::class, 'destroyAssets'])->name('rooms.assets.destroy');
    });
