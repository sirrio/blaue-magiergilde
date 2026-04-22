<?php

namespace App\Support;

use App\Models\User;

class FeatureAccess
{
    public static function canUseLevelCurveUpgrade(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        /** TODO: remove this temporary beta allowlist once level curve upgrades are released for everyone. */
        $allowedUserIds = config('features.level_curve_upgrade_user_ids', []);

        return in_array($user->id, $allowedUserIds, true);
    }
}
