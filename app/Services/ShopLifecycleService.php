<?php

namespace App\Services;

use App\Models\Shop;
use App\Models\ShopSetting;
use Illuminate\Support\Facades\DB;

class ShopLifecycleService
{
    public function __construct(
        private ShopRollService $shopRollService,
        private ShopPostService $shopPostService,
    ) {}

    public function ensureInitialized(): ShopSetting
    {
        return DB::transaction(function (): ShopSetting {
            $settings = ShopSetting::query()->lockForUpdate()->first();
            if (! $settings) {
                $settings = ShopSetting::query()->create();
            }

            $this->ensurePointers($settings);

            return $settings->fresh();
        });
    }

    /**
     * @return array{ok: bool, status?: int, error?: string, posted_shop_id?: int, current_shop_id?: int, draft_shop_id?: int}
     */
    public function publishDraft(?string $channelId = null, bool $markAsAutoPosted = false, ?callable $onStep = null): array
    {
        $settings = $this->ensureInitialized();
        $resolvedChannelId = trim((string) ($channelId ?: $settings->post_channel_id));
        if ($resolvedChannelId === '') {
            return [
                'ok' => false,
                'status' => 422,
                'error' => 'No shop posting channel configured.',
            ];
        }

        $draftShopId = (int) ($settings->draft_shop_id ?? 0);
        if ($draftShopId <= 0) {
            return [
                'ok' => false,
                'status' => 409,
                'error' => 'No draft shop available.',
            ];
        }

        $draftShop = Shop::query()->find($draftShopId);
        if (! $draftShop) {
            return [
                'ok' => false,
                'status' => 409,
                'error' => 'No draft shop available.',
            ];
        }

        $this->notifyStep($onStep, 'posting_to_discord');
        $postResult = $this->shopPostService->post($draftShop, $resolvedChannelId);
        if (! ($postResult['ok'] ?? false) && ! $this->recoverAfterTimeout($settings->id, $draftShopId, $postResult)) {
            return $postResult;
        }

        $this->notifyStep($onStep, 'rotating_pointers');
        $newDraftShopId = $this->shopRollService->roll()->id;
        $updatePayload = [
            'current_shop_id' => $draftShopId,
            'draft_shop_id' => $newDraftShopId,
            'updated_at' => now(),
        ];
        if ($markAsAutoPosted) {
            $updatePayload['last_auto_posted_at'] = now();
        }

        ShopSetting::query()
            ->whereKey($settings->id)
            ->update($updatePayload);

        return [
            'ok' => true,
            'status' => 200,
            'posted_shop_id' => $draftShopId,
            'current_shop_id' => $draftShopId,
            'draft_shop_id' => $newDraftShopId,
        ];
    }

    private function recoverAfterTimeout(int $settingsId, int $draftShopId, array $postResult): bool
    {
        if (! ($postResult['timed_out'] ?? false)) {
            return false;
        }

        $maxAttempts = 20;
        for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
            $latestSettings = ShopSetting::query()->find($settingsId);
            $payload = $latestSettings?->last_post_message_ids;
            $postedShopId = is_array($payload) ? (int) ($payload['shop_id'] ?? 0) : 0;

            if ($postedShopId === $draftShopId) {
                return true;
            }

            usleep(500_000);
        }

        return false;
    }

    /**
     * @return array{ok: bool, status?: int, error?: string, shop_id?: int}
     */
    public function updateCurrentPost(?callable $onStep = null): array
    {
        $settings = $this->ensureInitialized();
        $currentShopId = (int) ($settings->current_shop_id ?? 0);
        if ($currentShopId <= 0) {
            return [
                'ok' => false,
                'status' => 409,
                'error' => 'No current shop available.',
            ];
        }

        $currentShop = Shop::query()->find($currentShopId);
        if (! $currentShop) {
            return [
                'ok' => false,
                'status' => 409,
                'error' => 'Current shop not found.',
            ];
        }

        $this->notifyStep($onStep, 'posting_to_discord');
        $result = $this->shopPostService->update($currentShop);
        if (! ($result['ok'] ?? false)) {
            return $result;
        }

        return [
            'ok' => true,
            'status' => 200,
            'shop_id' => $currentShop->id,
        ];
    }

    public function rollNewDraft(): ShopSetting
    {
        return DB::transaction(function (): ShopSetting {
            $settings = ShopSetting::query()->lockForUpdate()->first();
            if (! $settings) {
                $settings = ShopSetting::query()->create();
            }

            $this->ensurePointers($settings);

            $settings->draft_shop_id = $this->shopRollService->roll()->id;
            $settings->save();

            return $settings->fresh();
        });
    }

    private function ensurePointers(ShopSetting $settings): void
    {
        $currentShopId = $this->resolveCurrentShopId($settings);
        if (! $currentShopId) {
            $currentShopId = $this->shopRollService->roll()->id;
        }

        $draftShopId = $this->resolveDraftShopId($settings, $currentShopId);
        if (! $draftShopId || $draftShopId === $currentShopId) {
            $draftShopId = $this->shopRollService->roll()->id;
        }

        if ($settings->current_shop_id !== $currentShopId || $settings->draft_shop_id !== $draftShopId) {
            $settings->current_shop_id = $currentShopId;
            $settings->draft_shop_id = $draftShopId;
            $settings->save();
        }
    }

    private function resolveCurrentShopId(ShopSetting $settings): ?int
    {
        if ($settings->current_shop_id && Shop::query()->whereKey($settings->current_shop_id)->exists()) {
            return (int) $settings->current_shop_id;
        }

        $lastPostedShopId = $this->extractLastPostedShopId($settings);
        if ($lastPostedShopId && Shop::query()->whereKey($lastPostedShopId)->exists()) {
            return $lastPostedShopId;
        }

        return Shop::query()->orderByDesc('id')->value('id');
    }

    private function resolveDraftShopId(ShopSetting $settings, int $currentShopId): ?int
    {
        if ($settings->draft_shop_id && (int) $settings->draft_shop_id !== $currentShopId) {
            $draftShopId = (int) $settings->draft_shop_id;
            if ($draftShopId > $currentShopId && Shop::query()->whereKey($draftShopId)->exists()) {
                return $draftShopId;
            }
        }

        return null;
    }

    private function extractLastPostedShopId(ShopSetting $settings): ?int
    {
        $payload = $settings->last_post_message_ids;
        if (! is_array($payload)) {
            return null;
        }

        $shopId = $payload['shop_id'] ?? null;
        if (! is_numeric($shopId)) {
            return null;
        }

        $parsedShopId = (int) $shopId;

        return $parsedShopId > 0 ? $parsedShopId : null;
    }

    private function notifyStep(?callable $onStep, string $step): void
    {
        if ($onStep === null) {
            return;
        }

        $onStep($step);
    }
}
