<?php

use App\Http\Controllers\RulesController;
use App\Http\Controllers\RulesAttachmentController;
use Illuminate\Support\Facades\Route;

Route::get('/rules', RulesController::class)
    ->middleware(['auth'])
    ->name('rules.index');

Route::get('/rules/attachments/{discordMessageAttachment}', RulesAttachmentController::class)
    ->middleware(['auth'])
    ->name('rules.attachments.show');
