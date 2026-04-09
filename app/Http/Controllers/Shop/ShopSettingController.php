<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shop\UpdateShopSettingRequest;
use App\Models\ShopRollRule;
use App\Models\ShopSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;

class ShopSettingController extends Controller
{
    public function __invoke(UpdateShopSettingRequest $request): JsonResponse
    {
        $payload = $request->validated();
        $rulePayload = Arr::pull($payload, 'roll_rules');

        $settings = ShopSetting::current();
        $settings->update($payload);

        if (is_array($rulePayload)) {
            ShopRollRule::query()->delete();

            $rules = collect($rulePayload)
                ->values()
                ->map(static function (array $rule, int $index): array {
                    return [
                        'rarity' => (string) $rule['rarity'],
                        'selection_types' => array_values(array_map(
                            static fn (mixed $type): string => (string) $type,
                            $rule['selection_types'] ?? [],
                        )),
                        'source_kind' => (string) $rule['source_kind'],
                        'section_title' => trim((string) $rule['section_title']),
                        'count' => (int) $rule['count'],
                        'sort_order' => isset($rule['sort_order']) ? (int) $rule['sort_order'] : (($index + 1) * 10),
                    ];
                })
                ->all();

            if ($rules !== []) {
                $timestamp = Carbon::now();

                ShopRollRule::query()->insert(array_map(
                    static fn (array $rule): array => array_merge($rule, [
                        'selection_types' => json_encode($rule['selection_types'], JSON_THROW_ON_ERROR),
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ]),
                    $rules,
                ));
            }
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
                    'rarity' => $rule->rarity,
                    'selection_types' => $rule->selection_types ?? [],
                    'source_kind' => $rule->source_kind,
                    'section_title' => $rule->section_title,
                    'count' => $rule->count,
                    'sort_order' => $rule->sort_order,
                ])->all(),
            ],
        ]);
    }
}
