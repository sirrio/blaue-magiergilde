<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\AppearanceController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::get('/impressum', fn () => Inertia::render('impressum'))->name('impressum');
Route::get('/privacy', fn () => Inertia::render('privacy'))->name('privacy');

Route::post('appearance', [AppearanceController::class, 'update'])->name('appearance.update');

require __DIR__.'/auth.php';
require __DIR__.'/web/adventure.php';
require __DIR__.'/web/ally.php';
require __DIR__.'/web/character.php';
require __DIR__.'/web/downtime.php';
require __DIR__.'/web/game.php';
require __DIR__.'/web/item.php';
require __DIR__.'/web/spell.php';
require __DIR__.'/web/shop.php';
require __DIR__.'/web/registered-player.php';
require __DIR__.'/web/user.php';
require __DIR__.'/web/settings.php';
