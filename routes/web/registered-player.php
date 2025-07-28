<?php

use App\Http\Controllers\RegisteredPlayer\RegisteredPlayerController;
use App\Http\Controllers\RegisteredPlayer\RegisteredCharacterController;
use Illuminate\Support\Facades\Route;

Route::resource('registered-players', RegisteredPlayerController::class)
    ->middleware(['auth']);

Route::resource('registered-players.characters', RegisteredCharacterController::class)
    ->shallow()
    ->middleware(['auth'])
    ->except(['index', 'show', 'create', 'edit']);
