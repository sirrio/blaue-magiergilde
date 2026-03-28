<?php

use App\Http\Controllers\Character\AvatarMaskController;
use App\Http\Controllers\Character\AvatarModeController;
use App\Http\Controllers\Character\CharacterController;
use App\Http\Controllers\Character\DeletedCharacterController;
use App\Http\Controllers\Character\DownloadCharacterController;
use App\Http\Controllers\Character\ForceDeleteDeletedCharacterController;
use App\Http\Controllers\Character\QuickLevelController;
use App\Http\Controllers\Character\RestoreDeletedCharacterController;
use App\Http\Controllers\Character\ShowDeletedCharacterController;
use App\Http\Controllers\Character\SortCharacterController;
use App\Http\Controllers\Character\SubmitCharacterForApprovalController;
use App\Http\Controllers\Character\TrackingModeController;
use Illuminate\Support\Facades\Route;

Route::get('characters/deleted', DeletedCharacterController::class)
    ->middleware(['auth'])
    ->name('characters.deleted');
Route::get('characters/deleted/{character}', ShowDeletedCharacterController::class)
    ->withTrashed()
    ->middleware(['auth'])
    ->name('characters.deleted.show');

Route::patch('characters/{character}/tracking', TrackingModeController::class)
    ->middleware(['auth'])
    ->name('characters.tracking');
Route::patch('characters/{character}/avatar-mode', AvatarModeController::class)
    ->middleware(['auth'])
    ->name('characters.avatar-mode');
Route::get('avatars/masked', AvatarMaskController::class)
    ->name('avatars.masked');
Route::post('characters/{character}/quick-level', [QuickLevelController::class, 'store'])
    ->middleware(['auth'])
    ->name('characters.quick-level');
Route::post('characters/{character}/submit-approval', SubmitCharacterForApprovalController::class)
    ->middleware(['auth'])
    ->name('characters.submit-approval');

Route::resource('characters', CharacterController::class)->only([
    'index',
    'show',
    'store',
    'update',
    'destroy',
])->middleware(['auth']);

Route::post('characters/sort', SortCharacterController::class)
    ->middleware(['auth'])
    ->name('characters.sort');
Route::post('characters/{character}/restore-deleted', RestoreDeletedCharacterController::class)
    ->withTrashed()
    ->middleware(['auth'])
    ->name('characters.restore-deleted');
Route::delete('characters/{character}/force-delete', ForceDeleteDeletedCharacterController::class)
    ->withTrashed()
    ->middleware(['auth'])
    ->name('characters.force-delete');
Route::get('characters/{character}/download', DownloadCharacterController::class)
    ->middleware(['auth'])
    ->name('characters.download');
