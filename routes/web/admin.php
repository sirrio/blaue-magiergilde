<?php

use App\Http\Controllers\Admin\BackupController;
use App\Http\Controllers\Admin\CompendiumImportController;
use App\Http\Controllers\Admin\DiscordBackupController;
use App\Http\Controllers\Admin\DiscordBackupSettingsController;
use App\Http\Controllers\Admin\DiscordBotSettingsController;
use App\Http\Controllers\Admin\GameSettingsController;
use App\Http\Controllers\Admin\SourceController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'admin'])->group(function () {
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

    Route::patch('/admin/settings/discord/bot', [DiscordBotSettingsController::class, 'update'])
        ->name('admin.settings.bot.update');

    Route::post('/admin/settings/sources', [SourceController::class, 'store'])
        ->name('admin.settings.sources.store');

    Route::patch('/admin/settings/sources/{source}', [SourceController::class, 'update'])
        ->name('admin.settings.sources.update');

    Route::delete('/admin/settings/sources/{source}', [SourceController::class, 'destroy'])
        ->name('admin.settings.sources.destroy');

    Route::get('/admin/settings/compendium/template', [CompendiumImportController::class, 'template'])
        ->name('admin.settings.compendium.template');

    Route::post('/admin/settings/compendium/preview', [CompendiumImportController::class, 'preview'])
        ->name('admin.settings.compendium.preview');

    Route::post('/admin/settings/compendium/apply', [CompendiumImportController::class, 'apply'])
        ->name('admin.settings.compendium.apply');

    Route::get('/admin/games', [GameSettingsController::class, 'index'])->name('admin.games');
    Route::patch('/admin/games', [DiscordBotSettingsController::class, 'update'])->name('admin.games.update');
    Route::post('/admin/games/scan', [GameSettingsController::class, 'scan'])->name('admin.games.scan');

});
