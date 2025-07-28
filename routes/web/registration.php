<?php

use App\Http\Controllers\RegistrationController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('registrations', [RegistrationController::class, 'index'])
    ->middleware(['auth'])
    ->name('registrations.index');

Route::get('signup', fn () => Inertia\Inertia::render('registration/index'))
    ->name('registrations.form');

Route::post('registrations', [RegistrationController::class, 'store'])
    ->name('registrations.store');

Route::put('registrations/{registration}', [RegistrationController::class, 'update'])
    ->middleware(['auth'])
    ->name('registrations.update');
