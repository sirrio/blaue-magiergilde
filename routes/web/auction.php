<?php

use App\Http\Controllers\Auction\AuctionBidController;
use App\Http\Controllers\Auction\AuctionController;
use App\Http\Controllers\Auction\AuctionHiddenBidController;
use App\Http\Controllers\Auction\AuctionItemController;
use App\Http\Controllers\Auction\AuctionPostController;
use App\Http\Controllers\Auction\AuctionSettingController;
use Illuminate\Support\Facades\Route;

Route::resource('auctions', AuctionController::class)->only([
    'index',
    'store',
    'update',
])->middleware(['auth']);

Route::post('auctions/{auction}/post', AuctionPostController::class)
    ->middleware(['auth'])
    ->name('auctions.post');

Route::patch('auctions/settings', AuctionSettingController::class)
    ->middleware(['auth'])
    ->name('auction-settings.update');

Route::post('auctions/{auction}/items', [AuctionItemController::class, 'store'])
    ->middleware(['auth'])
    ->name('auction-items.store');

Route::post('auction-items/{auctionItem}/bids', [AuctionBidController::class, 'store'])
    ->middleware(['auth'])
    ->name('auction-items.bids.store');

Route::post('auction-items/{auctionItem}/hidden-bids', [AuctionHiddenBidController::class, 'store'])
    ->middleware(['auth'])
    ->name('auction-items.hidden-bids.store');

Route::delete('auction-bids/{auctionBid}', [AuctionBidController::class, 'destroy'])
    ->middleware(['auth'])
    ->name('auction-bids.destroy');

Route::delete('auction-hidden-bids/{auctionHiddenBid}', [AuctionHiddenBidController::class, 'destroy'])
    ->middleware(['auth'])
    ->name('auction-hidden-bids.destroy');
