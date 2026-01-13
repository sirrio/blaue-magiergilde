<?php

use App\Http\Controllers\Admin\CharacterApprovalController;
use Illuminate\Support\Facades\Route;

Route::get('admin/character-approvals', [CharacterApprovalController::class, 'index'])
    ->middleware(['auth'])
    ->name('admin.character-approvals.index');

Route::patch('admin/character-approvals/characters/{character}', [CharacterApprovalController::class, 'update'])
    ->middleware(['auth'])
    ->name('admin.character-approvals.update');

Route::delete('admin/character-approvals/users/{user}', [CharacterApprovalController::class, 'destroyUser'])
    ->middleware(['auth'])
    ->name('admin.character-approvals.users.destroy');
