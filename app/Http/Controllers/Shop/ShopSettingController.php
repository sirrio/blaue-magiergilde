<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shop\UpdateShopSettingRequest;
use App\Models\ShopRollRule;
use App\Models\ShopSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class ShopSettingController extends Controller
{
    public function __invoke(UpdateShopSettingRequest $request): JsonResponse
    {
        $payload = $request->validated();
        $rulePayload = Arr::pull($payload, 'roll_rules');

        $settings = ShopSetting::current();
        $settings->update($payload);

        if (is_array($rulePayload)) {
            DB::transaction(function () use ($rulePayload): void {
                $existingRules = ShopRollRule::query()->get()->keyBy('id');
                $persistedIds = [];

                collect($rulePayload)
                    ->values()
                    ->each(function (array $rule, int $index) use ($existingRules, &$persistedIds): void {
                        $rowKind = (string) $rule['row_kind'];

                        $attributes = [
                            'row_kind' => $rowKind,
                            'rarity' => $rowKind === 'heading' ? 'common' : (string) $rule['rarity'],
                            'selection_types' => array_values(array_map(
                                static fn (mixed $type): string => (string) $type,
                                $rowKind === 'heading' ? ['item'] : ($rule['selection_types'] ?? []),
                            )),
                            'source_kind' => $rowKind === 'heading' ? 'all' : (string) $rule['source_kind'],
                            'heading_title' => $rowKind === 'heading' ? trim((string) $rule['heading_title']) : '',
                            'count' => $rowKind === 'heading' ? 0 : (int) $rule['count'],
                            'sort_order' => isset($rule['sort_order']) ? (int) $rule['sort_order'] : (($index + 1) * 10),
                        ];

                        $ruleId = isset($rule['id']) ? (int) $rule['id'] : null;

                        if ($ruleId !== null && $existingRules->has($ruleId)) {
                            $existingRules[$ruleId]->update($attributes);
                            $persistedIds[] = $ruleId;

                            return;
                        }

                        $createdRule = ShopRollRule::query()->create($attributes);
                        $persistedIds[] = $createdRule->id;
                    });

                ShopRollRule::query()
                    ->when(
                        $persistedIds !== [],
                        fn ($query) => $query->whereNotIn('id', $persistedIds),
                        fn ($query) => $query,
                    )
                    ->delete();
            });
        }

        $rollRules = ShopRollRule::ordered();

        return response()->json([
            'status' => 'saved',
            'shop_settings' => $settings->only([
                'post_channel_id',
                'post_channel_name',
                'post_channel_type',
                'post_channel_guild_id',
                'post_channel_is_thread',
                'last_post_channel_id',
                'auto_post_enabled',
                'auto_post_weekday',
                'auto_post_time',
                'last_auto_posted_at',
                'current_shop_id',
                'draft_shop_id',
            ]) + [
                'roll_rules' => $rollRules->map(fn (ShopRollRule $rule): array => [
                    'id' => $rule->id,
                    'row_kind' => $rule->row_kind,
                    'rarity' => $rule->rarity,
                    'selection_types' => $rule->selection_types ?? [],
                    'source_kind' => $rule->source_kind,
                    'heading_title' => $rule->heading_title,
                    'count' => $rule->count,
                    'sort_order' => $rule->sort_order,
                ])->all(),
            ],
        ]);
    }
}
