<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

require __DIR__ . '/auth.php';
require __DIR__ . '/web/adventure.php';
require __DIR__ . '/web/ally.php';
require __DIR__ . '/web/character.php';
require __DIR__ . '/web/characterClass.php';
require __DIR__ . '/web/downtime.php';
require __DIR__ . '/web/game.php';
require __DIR__ . '/web/item.php';
require __DIR__ . '/web/spell.php';
require __DIR__ . '/web/shop.php';
require __DIR__ . '/web/user.php';
