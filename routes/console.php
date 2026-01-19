<?php

use App\Models\ShopSetting;
use App\Services\ShopPostService;
use App\Services\ShopRollService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('shop:post-weekly', function (ShopRollService $shopRoller, ShopPostService $service) {
    $settings = ShopSetting::current();
    $channelId = $settings->post_channel_id;

    if (! $channelId) {
        $this->error('No shop posting channel configured.');

        return 1;
    }

    $shop = $shopRoller->roll();

    $result = $service->post($shop, $channelId);
    if (! ($result['ok'] ?? false)) {
        $this->error((string) ($result['error'] ?? 'Shop post failed.'));

        return 1;
    }

    $settings->forceFill(['last_auto_posted_at' => now()])->save();

    $this->info(sprintf('Posted shop #%d.', $shop->id));

    return 0;
})->purpose('Post the latest shop to Discord.');

Schedule::command('shop:post-weekly')
    ->everyMinute()
    ->timezone('Europe/Berlin')
    ->when(function () {
        $settings = ShopSetting::current();
        if (! $settings->auto_post_enabled) {
            return false;
        }

        $scheduledTime = $settings->auto_post_time;
        if (! $scheduledTime) {
            return false;
        }

        $now = now('Europe/Berlin');
        $scheduledDay = $settings->auto_post_weekday ?? 0;
        if ((int) $now->dayOfWeek !== (int) $scheduledDay) {
            return false;
        }

        if ($now->format('H:i') !== $scheduledTime) {
            return false;
        }

        $lastPostedAt = $settings->last_auto_posted_at;
        if ($lastPostedAt && $lastPostedAt->diffInMinutes($now) < 1) {
            return false;
        }

        return true;
    })
    ->withoutOverlapping(10);
