<?php

use App\Http\Controllers\Registration\RegistrationController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('registrations', [RegistrationController::class, 'index'])->name('registrations.index');
    Route::get('registrations/create', [RegistrationController::class, 'create'])->name('registrations.create');
    Route::post('registrations', [RegistrationController::class, 'store'])->name('registrations.store');
    Route::get('registrations/{registration}/edit', [RegistrationController::class, 'edit'])->name('registrations.edit');
    Route::put('registrations/{registration}', [RegistrationController::class, 'update'])->name('registrations.update');
});
