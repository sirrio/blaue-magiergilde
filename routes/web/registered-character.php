<?php

use App\Http\Controllers\RegisteredCharacter\RegisteredCharacterController;
use Illuminate\Support\Facades\Route;

Route::resource('registered-characters', RegisteredCharacterController::class)
    ->only(['index'])
    ->middleware(['auth']);
