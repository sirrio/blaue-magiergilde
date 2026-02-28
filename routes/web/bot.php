<?php

use App\Http\Controllers\Bot\CharacterApprovalController;
use App\Http\Controllers\Bot\CharacterAvatarController;
use App\Http\Controllers\Bot\DiscordBackupController;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Support\Facades\Route;

Route::prefix('bot')
    ->withoutMiddleware([VerifyCsrfToken::class])
    ->group(function () {
        Route::get('discord-backups/channels', [DiscordBackupController::class, 'channels'])
            ->name('bot.discord-backups.channels');

        Route::post('discord-backups/channels', [DiscordBackupController::class, 'storeChannels'])
            ->name('bot.discord-backups.channels.store');

        Route::post('discord-backups/messages', [DiscordBackupController::class, 'storeMessages'])
            ->name('bot.discord-backups.messages.store');

        Route::post('discord-backups/attachments', [DiscordBackupController::class, 'storeAttachment'])
            ->name('bot.discord-backups.attachments.store');

        Route::post('character-avatars', [CharacterAvatarController::class, 'store'])
            ->name('bot.characters.avatar');

        Route::post('character-approvals/status', [CharacterApprovalController::class, 'updateStatus'])
            ->name('bot.character-approvals.status');

        Route::post('character-approvals/sync', [CharacterApprovalController::class, 'sync'])
            ->name('bot.character-approvals.sync');
    });
