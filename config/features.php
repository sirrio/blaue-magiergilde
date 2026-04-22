<?php

$levelCurveUpgradeUserIds = collect(explode(',', (string) env('FEATURE_LEVEL_CURVE_UPGRADE_USER_IDS', '')))
    ->map(static fn (string $value): ?int => filter_var(trim($value), FILTER_VALIDATE_INT, FILTER_NULL_ON_FAILURE))
    ->filter(static fn (?int $value): bool => $value !== null && $value > 0)
    ->values()
    ->all();

return [
    'games_calendar' => env('FEATURE_GAMES_CALENDAR', true),
    'rooms' => env('FEATURE_ROOMS', true),
    'character_status_switch' => env('FEATURE_CHARACTER_STATUS_SWITCH', true),
    /** TODO: remove this temporary beta allowlist once level curve upgrades are released for everyone. */
    'level_curve_upgrade_user_ids' => $levelCurveUpgradeUserIds,
];
