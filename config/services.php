<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'discord' => [
        'client_id' => env('DISCORD_CLIENT_ID'),
        'client_secret' => env('DISCORD_CLIENT_SECRET'),
        'redirect' => env('DISCORD_REDIRECT_URI'),
        'bot_token' => env('DISCORD_BOT_TOKEN'),

        // optional
        'allow_gif_avatars' => (bool) env('DISCORD_AVATAR_GIF', true),
        'avatar_default_extension' => env('DISCORD_EXTENSION_DEFAULT', 'png'), // only pick from jpg, png, webp
    ],

    'bot' => [
        'app_url' => env('BOT_APP_URL'),
        'public_url' => env('BOT_PUBLIC_APP_URL'),
        'http_url' => env('BOT_HTTP_URL'),
        'http_token' => env('BOT_HTTP_TOKEN'),
        'http_timeout' => env('BOT_HTTP_TIMEOUT', 60),
        'games_channel_id' => env('DISCORD_GAMES_CHANNEL_ID'),
    ],

];
