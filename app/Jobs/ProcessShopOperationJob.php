<?php

namespace App\Jobs;

use App\Models\ShopOperation;
use App\Services\ShopLifecycleService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ProcessShopOperationJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 180;

    public int $tries = 1;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $shopOperationId,
    ) {}

    public static function dispatchForOperation(ShopOperation $operation): void
    {
        self::dispatch($operation->id)->onConnection('database');
    }

    /**
     * Execute the job.
     */
    public function handle(ShopLifecycleService $shopLifecycleService): void
    {
        $operation = ShopOperation::query()->find($this->shopOperationId);
        if (! $operation || $operation->isTerminal()) {
            return;
        }

        if ($operation->status !== ShopOperation::STATUS_PENDING) {
            return;
        }

        $this->markStep($operation, ShopOperation::STATUS_PENDING);

        try {
            $result = match ($operation->action) {
                ShopOperation::ACTION_PUBLISH_DRAFT => $shopLifecycleService->publishDraft(
                    $operation->channel_id,
                    false,
                    fn (string $step) => $this->markStep($operation, $step),
                    $operation->id,
                ),
                ShopOperation::ACTION_UPDATE_CURRENT_POST => $shopLifecycleService->updateCurrentPost(
                    fn (string $step) => $this->markStep($operation, $step),
                    $operation->id,
                ),
                default => [
                    'ok' => false,
                    'status' => 422,
                    'error' => 'Unknown shop operation.',
                ],
            };
        } catch (\Throwable $error) {
            $this->markFailed($operation, 'Shop operation failed. '.$error->getMessage());

            return;
        }

        if (! ($result['ok'] ?? false)) {
            $this->markFailed($operation, (string) ($result['error'] ?? 'Shop operation failed.'));

            return;
        }

        $operation->status = ShopOperation::STATUS_COMPLETED;
        $operation->step = ShopOperation::STATUS_COMPLETED;
        $operation->error = null;
        $operation->result_shop_id = isset($result['posted_shop_id'])
            ? (int) $result['posted_shop_id']
            : (isset($result['shop_id']) ? (int) $result['shop_id'] : null);
        $operation->current_shop_id = isset($result['current_shop_id']) ? (int) $result['current_shop_id'] : $operation->current_shop_id;
        $operation->draft_shop_id = isset($result['draft_shop_id']) ? (int) $result['draft_shop_id'] : $operation->draft_shop_id;
        $operation->finished_at = now();
        $operation->save();
    }

    private function markStep(ShopOperation $operation, string $step): void
    {
        $operation->status = $step;
        $operation->step = $step;
        if ($operation->started_at === null) {
            $operation->started_at = now();
        }
        $operation->save();
    }

    private function markFailed(ShopOperation $operation, string $error): void
    {
        $operation->status = ShopOperation::STATUS_FAILED;
        $operation->error = $error;
        $operation->finished_at = now();
        if ($operation->started_at === null) {
            $operation->started_at = now();
        }
        $operation->save();
    }
}
