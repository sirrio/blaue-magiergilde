<?php

namespace App\Jobs;

use App\Models\BotOperation;
use App\Services\AuctionPostService;
use App\Services\BackstockPostService;
use App\Services\ShopLifecycleService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ProcessBotOperationJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    public int $tries = 1;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $botOperationId,
    ) {}

    public static function dispatchForOperation(BotOperation $operation): void
    {
        self::dispatch($operation->id)->onConnection('database');
    }

    /**
     * Execute the job.
     */
    public function handle(
        ShopLifecycleService $shopLifecycleService,
        BackstockPostService $backstockPostService,
        AuctionPostService $auctionPostService,
    ): void {
        $operation = BotOperation::query()->find($this->botOperationId);
        if (! $operation || $operation->isTerminal()) {
            return;
        }

        if ($operation->status !== BotOperation::STATUS_PENDING) {
            return;
        }

        $this->markStep($operation, BotOperation::STATUS_PENDING);

        try {
            $result = match ($operation->action) {
                BotOperation::ACTION_PUBLISH_DRAFT => $shopLifecycleService->publishDraft(
                    $operation->channel_id,
                    false,
                    fn (string $step) => $this->markStep($operation, $step),
                    $operation->id,
                ),
                BotOperation::ACTION_UPDATE_CURRENT_POST => $shopLifecycleService->updateCurrentPost(
                    fn (string $step) => $this->markStep($operation, $step),
                    $operation->id,
                ),
                BotOperation::ACTION_POST_BACKSTOCK => $this->postBackstock(
                    $operation,
                    $backstockPostService,
                ),
                BotOperation::ACTION_POST_AUCTION => $this->postAuction(
                    $operation,
                    $auctionPostService,
                ),
                default => [
                    'ok' => false,
                    'status' => 422,
                    'error' => 'Unknown bot operation.',
                ],
            };
        } catch (\Throwable $error) {
            $this->markFailed($operation, 'Bot operation failed. '.$error->getMessage());

            return;
        }

        if (! ($result['ok'] ?? false)) {
            $this->markFailed($operation, (string) ($result['error'] ?? 'Bot operation failed.'));

            return;
        }

        $operation->status = BotOperation::STATUS_COMPLETED;
        $operation->step = BotOperation::STATUS_COMPLETED;
        $operation->error = null;
        $operation->result_shop_id = isset($result['posted_shop_id'])
            ? (int) $result['posted_shop_id']
            : (isset($result['shop_id']) ? (int) $result['shop_id'] : null);
        $operation->current_shop_id = isset($result['current_shop_id']) ? (int) $result['current_shop_id'] : $operation->current_shop_id;
        $operation->draft_shop_id = isset($result['draft_shop_id']) ? (int) $result['draft_shop_id'] : $operation->draft_shop_id;
        $operation->finished_at = now();
        $operation->save();
    }

    private function postBackstock(BotOperation $operation, BackstockPostService $backstockPostService): array
    {
        $this->markStep($operation, BotOperation::STATUS_POSTING_TO_DISCORD);

        return $backstockPostService->post((string) $operation->channel_id, $operation->id);
    }

    private function postAuction(BotOperation $operation, AuctionPostService $auctionPostService): array
    {
        $auctionId = (int) ($operation->resource_id ?? 0);
        if ($auctionId <= 0) {
            return [
                'ok' => false,
                'status' => 422,
                'error' => 'Auction ID is missing.',
            ];
        }

        $this->markStep($operation, BotOperation::STATUS_POSTING_TO_DISCORD);

        return $auctionPostService->post($auctionId, (string) $operation->channel_id, $operation->id);
    }

    private function markStep(BotOperation $operation, string $step): void
    {
        $operation->status = $step;
        $operation->step = $step;
        if ($operation->started_at === null) {
            $operation->started_at = now();
        }
        $operation->save();
    }

    private function markFailed(BotOperation $operation, string $error): void
    {
        $operation->status = BotOperation::STATUS_FAILED;
        $operation->error = $error;
        $operation->finished_at = now();
        if ($operation->started_at === null) {
            $operation->started_at = now();
        }
        $operation->save();
    }
}
