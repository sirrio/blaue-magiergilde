<?php

return [
    // Default: enabled when Discord OAuth is configured (can be overridden via FEATURE_DISCORD).
    'discord' => env('FEATURE_DISCORD', (bool) env('DISCORD_CLIENT_ID')),
    'character_manager' => env('FEATURE_CHARACTER_MANAGER', env('APP_ENV') === 'local'),
];
