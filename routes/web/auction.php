<?php

use App\Http\Controllers\Auction\AuctionBidController;
use App\Http\Controllers\Auction\AuctionController;
use App\Http\Controllers\Auction\AuctionHiddenBidController;
use App\Http\Controllers\Auction\AuctionItemController;
use App\Http\Controllers\Auction\AuctionPostController;
use App\Http\Controllers\Auction\AuctionSettingController;
use App\Http\Controllers\Auction\AuctionVoiceSyncController;
use App\Http\Controllers\Auction\FinalizeAuctionItemController;
use App\Http\Controllers\Auction\RefreshAuctionItemSnapshotController;
use App\Http\Controllers\Auction\UpdateAuctionItemSnapshotController;
use Illuminate\Support\Facades\Route;

Route::pattern('auction', '[0-9]+');

Route::middleware(['auth', 'admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::resource('auctions', AuctionController::class)->only([
            'index',
            'store',
            'update',
        ]);

        Route::post('auctions/{auction}/post', AuctionPostController::class)
            ->name('auctions.post');

        Route::patch('auctions/settings', AuctionSettingController::class)
            ->name('auction-settings.update');

        Route::post('auctions/voice/sync', AuctionVoiceSyncController::class)
            ->name('auctions.voice.sync');

        Route::post('auctions/{auction}/items', [AuctionItemController::class, 'store'])
            ->name('auction-items.store');

        Route::post('auction-items/{auctionItem}/bids', [AuctionBidController::class, 'store'])
            ->name('auction-items.bids.store');

        Route::post('auction-items/{auctionItem}/hidden-bids', [AuctionHiddenBidController::class, 'store'])
            ->name('auction-items.hidden-bids.store');

        Route::patch('auction-items/{auctionItem}/snapshot', UpdateAuctionItemSnapshotController::class)
            ->name('auction-items.snapshot.update');

        Route::post('auction-items/{auctionItem}/snapshot/refresh', RefreshAuctionItemSnapshotController::class)
            ->name('auction-items.snapshot.refresh');

        Route::post('auction-items/{auctionItem}/finalize', FinalizeAuctionItemController::class)
            ->name('auction-items.finalize');

        Route::delete('auction-bids/{auctionBid}', [AuctionBidController::class, 'destroy'])
            ->name('auction-bids.destroy');

        Route::delete('auction-hidden-bids/{auctionHiddenBid}', [AuctionHiddenBidController::class, 'destroy'])
            ->name('auction-hidden-bids.destroy');
    });
