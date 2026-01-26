<?php

use App\Http\Controllers\Admin\CharacterApprovalController;
use App\Http\Controllers\Admin\CharacterManagementController;
use Illuminate\Support\Facades\Route;

Route::get('admin/character-approvals', [CharacterApprovalController::class, 'index'])
    ->middleware(['auth', 'admin'])
    ->name('admin.character-approvals.index');

Route::patch('admin/character-approvals/characters/{character}', [CharacterApprovalController::class, 'update'])
    ->middleware(['auth', 'admin'])
    ->name('admin.character-approvals.update');

Route::delete('admin/character-approvals/users/{user}', [CharacterApprovalController::class, 'destroyUser'])
    ->middleware(['auth', 'admin'])
    ->name('admin.character-approvals.users.destroy');

Route::post('admin/character-approvals/users/{user}/characters', [CharacterManagementController::class, 'store'])
    ->middleware(['auth', 'admin'])
    ->name('admin.character-approvals.characters.store');

Route::patch('admin/character-approvals/characters/{character}/details', [CharacterManagementController::class, 'update'])
    ->middleware(['auth', 'admin'])
    ->name('admin.character-approvals.characters.update');

Route::post('admin/character-approvals/characters/{character}/quick-level', [CharacterManagementController::class, 'setQuickLevel'])
    ->middleware(['auth', 'admin'])
    ->name('admin.character-approvals.characters.quick-level');
