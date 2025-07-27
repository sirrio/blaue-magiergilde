<?php

use App\Http\Controllers\Spell\SpellController;
use Illuminate\Support\Facades\Route;

Route::resource('spells', SpellController::class)->only([
    'index',
    'store',
    'update',
])->middleware(['auth']);
