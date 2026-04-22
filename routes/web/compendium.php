<?php

use App\Http\Controllers\Compendium\CompendiumCommentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::post('/compendium/items/{item}/comments', [CompendiumCommentController::class, 'storeItem'])
        ->name('compendium.items.comments.store');
    Route::post('/compendium/spells/{spell}/comments', [CompendiumCommentController::class, 'storeSpell'])
        ->name('compendium.spells.comments.store');
    Route::post('/compendium/classes/{characterClass}/comments', [CompendiumCommentController::class, 'storeCharacterClass'])
        ->name('compendium.character-classes.comments.store');
    Route::post('/compendium/variants/{mundaneItemVariant}/comments', [CompendiumCommentController::class, 'storeMundaneItemVariant'])
        ->name('compendium.mundane-item-variants.comments.store');
    Route::delete('/compendium/comments/{compendiumComment}', [CompendiumCommentController::class, 'destroy'])
        ->name('compendium.comments.destroy');
});
