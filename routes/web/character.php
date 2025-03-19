<?php

use App\Http\Controllers\Character\CharacterController;
use App\Http\Controllers\Character\PermanentDeleteCharacterController;
use App\Http\Controllers\Character\RestoreDeletedCharacterController;
use App\Http\Controllers\Character\SortCharacterController;
use Illuminate\Support\Facades\Route;

Route::resource('characters', CharacterController::class)->only([
  'index',
  'show',
  'store',
  'update',
  'destroy'
])->middleware(['auth']);

Route::post('characters/sort', SortCharacterController::class)->middleware(['auth'])->name('characters.sort');
Route::post('characters/{character}/permanent-delete', PermanentDeleteCharacterController::class)->middleware(['auth'])->name('characters.permanent-delete');
Route::post('characters/{character}/restore-deleted', RestoreDeletedCharacterController::class)->middleware(['auth'])->name('characters.restore-deleted');

