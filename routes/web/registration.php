<?php

use App\Http\Controllers\Admin\CharacterRegistrationController;
use Illuminate\Support\Facades\Route;

Route::get('registrations', [CharacterRegistrationController::class, 'index'])
    ->middleware(['auth'])
    ->name('registrations.index');

Route::patch('registrations/characters/{character}', [CharacterRegistrationController::class, 'update'])
    ->middleware(['auth'])
    ->name('registrations.characters.update');
