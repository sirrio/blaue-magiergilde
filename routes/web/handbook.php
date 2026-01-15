<?php

use App\Http\Controllers\HandbookAttachmentController;
use App\Http\Controllers\HandbookController;
use Illuminate\Support\Facades\Route;

Route::get('/handbook', HandbookController::class)
    ->middleware(['auth'])
    ->name('handbook.index');

Route::get('/handbook/attachments/{discordMessageAttachment}', HandbookAttachmentController::class)
    ->middleware(['auth'])
    ->name('handbook.attachments.show');

Route::get('/rules', function () {
    return redirect()->route('handbook.index', request()->query());
})
    ->middleware(['auth'])
    ->name('handbook.legacy');
