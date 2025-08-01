<?php

return [
    'discord' => env('FEATURE_DISCORD', env('APP_ENV') === 'local'),
    'character_manager' => env('FEATURE_CHARACTER_MANAGER', env('APP_ENV') === 'local'),
];
