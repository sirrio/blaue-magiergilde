<?php

use App\Models\ShopSetting;
use App\Services\ShopLifecycleService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('shop:post-weekly', function (ShopLifecycleService $service) {
    $result = $service->publishDraft(markAsAutoPosted: true);
    if (! ($result['ok'] ?? false)) {
        $this->error((string) ($result['error'] ?? 'Shop post failed.'));

        return 1;
    }

    $this->info(sprintf('Posted shop #%d.', (int) ($result['posted_shop_id'] ?? 0)));

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
