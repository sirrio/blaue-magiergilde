<?php

use App\Http\Controllers\Admin\BackupController;
use App\Http\Controllers\Admin\DiscordBotSettingsController;
use App\Http\Controllers\Admin\DiscordBackupController;
use App\Http\Controllers\Admin\DiscordBackupSettingsController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::get('/admin/backup', [BackupController::class, 'index'])->name('admin.backup');

    Route::post('/admin/backup/discord', [DiscordBackupController::class, 'store'])
        ->name('admin.backup.store');

    Route::post('/admin/backup/discord/status', [DiscordBackupController::class, 'status'])
        ->name('admin.backup.status');

    Route::post('/admin/backup/discord/channels/{discordChannel}/sync', [DiscordBackupController::class, 'syncChannel'])
        ->name('admin.backup.channels.sync');

    Route::delete('/admin/backup/discord', [DiscordBackupController::class, 'destroy'])
        ->name('admin.backup.destroy');

    Route::post('/admin/backup/discord/channels', [DiscordBackupSettingsController::class, 'refresh'])
        ->name('admin.backup.channels.refresh');

    Route::post('/admin/backup/discord/threads', [DiscordBackupSettingsController::class, 'threads'])
        ->name('admin.backup.threads.refresh');

    Route::patch('/admin/backup/discord/channels', [DiscordBackupSettingsController::class, 'update'])
        ->name('admin.backup.channels.update');

    Route::patch('/admin/backup/discord/owners', [DiscordBotSettingsController::class, 'update'])
        ->name('admin.backup.owners.update');

});
