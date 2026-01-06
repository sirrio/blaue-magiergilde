<?php

use App\Http\Controllers\Auction\AuctionBidController;
use App\Http\Controllers\Auction\AuctionController;
use App\Http\Controllers\Auction\AuctionItemController;
use Illuminate\Support\Facades\Route;

Route::resource('auctions', AuctionController::class)->only([
    'index',
    'store',
    'update',
])->middleware(['auth']);

Route::post('auctions/{auction}/items', [AuctionItemController::class, 'store'])
    ->middleware(['auth'])
    ->name('auction-items.store');

Route::post('auction-items/{auctionItem}/bids', [AuctionBidController::class, 'store'])
    ->middleware(['auth'])
    ->name('auction-items.bids.store');

Route::delete('auction-bids/{auctionBid}', [AuctionBidController::class, 'destroy'])
    ->middleware(['auth'])
    ->name('auction-bids.destroy');
