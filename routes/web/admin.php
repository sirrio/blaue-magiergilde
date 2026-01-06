<?php

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
});
