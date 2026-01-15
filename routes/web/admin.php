<?php

use App\Http\Controllers\Admin\BackupController;
use App\Http\Controllers\Admin\DiscordBotSettingsController;
use App\Http\Controllers\Admin\DiscordBackupController;
use App\Http\Controllers\Admin\DiscordBackupSettingsController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::redirect('/admin/backup', '/admin/settings');
    Route::get('/admin/settings', [BackupController::class, 'index'])->name('admin.settings');

    Route::post('/admin/settings/discord/backup', [DiscordBackupController::class, 'store'])
        ->name('admin.settings.backup.store');

    Route::post('/admin/settings/discord/backup/status', [DiscordBackupController::class, 'status'])
        ->name('admin.settings.backup.status');

    Route::post('/admin/settings/discord/backup/channels/{discordChannel}/sync', [DiscordBackupController::class, 'syncChannel'])
        ->name('admin.settings.backup.channels.sync');

    Route::delete('/admin/settings/discord/backup', [DiscordBackupController::class, 'destroy'])
        ->name('admin.settings.backup.destroy');

    Route::post('/admin/settings/discord/backup/channels', [DiscordBackupSettingsController::class, 'refresh'])
        ->name('admin.settings.backup.channels.refresh');

    Route::post('/admin/settings/discord/backup/threads', [DiscordBackupSettingsController::class, 'threads'])
        ->name('admin.settings.backup.threads.refresh');

    Route::patch('/admin/settings/discord/backup/channels', [DiscordBackupSettingsController::class, 'update'])
        ->name('admin.settings.backup.channels.update');

    Route::patch('/admin/settings/discord/bot/owners', [DiscordBotSettingsController::class, 'update'])
        ->name('admin.settings.bot.owners.update');

    Route::get('/admin/settings/discord/bot/owners/status', [DiscordBotSettingsController::class, 'status'])
        ->name('admin.settings.bot.owners.status');

});
