<?php

return [
    'discord' => env('FEATURE_DISCORD', env('APP_ENV') === 'local'),
];
