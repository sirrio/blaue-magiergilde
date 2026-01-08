<?php

use App\Http\Controllers\Admin\DiscordBackupBrowserController;
use App\Http\Controllers\Admin\DiscordBackupController;
use App\Http\Controllers\Admin\DiscordBackupSettingsController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Auction\VoiceSettingController;
use App\Http\Controllers\Auction\VoiceSettingSyncController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::get('/admin/settings', [SettingsController::class, 'index'])->name('admin.settings');

    Route::patch('/admin/settings/voice', VoiceSettingController::class)
        ->name('voice-settings.update');

    Route::post('/admin/settings/voice/sync', VoiceSettingSyncController::class)
        ->name('voice-settings.sync');

    Route::post('/admin/settings/discord-backup', [DiscordBackupController::class, 'store'])
        ->name('discord-backup.store');

    Route::post('/admin/settings/discord-backup/status', [DiscordBackupController::class, 'status'])
        ->name('discord-backup.status');

    Route::delete('/admin/settings/discord-backup', [DiscordBackupController::class, 'destroy'])
        ->name('discord-backup.destroy');

    Route::post('/admin/settings/discord-backup/channels', [DiscordBackupSettingsController::class, 'refresh'])
        ->name('discord-backup.channels.refresh');

    Route::patch('/admin/settings/discord-backup/channels', [DiscordBackupSettingsController::class, 'update'])
        ->name('discord-backup.channels.update');

    Route::get('/admin/discord-backup/attachments/{discordMessageAttachment}', [DiscordBackupBrowserController::class, 'download'])
        ->name('admin.discord-backup.attachments.show');

    Route::get('/admin/discord-backup/{discordChannel}', [DiscordBackupBrowserController::class, 'show'])
        ->name('admin.discord-backup.show');

    Route::get('/admin/discord-backup', [DiscordBackupBrowserController::class, 'index'])
        ->name('admin.discord-backup.index');
});
