<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // The favicon view is rendered by Inertia which evaluates `@vite` in the
    // blade template. Tests below rebind `app['env']` away from 'testing',
    // which causes `runningUnitTests()` to return false and Vite to try
    // resolving the production manifest. Stub Vite for these tests instead.
    $this->withoutVite();
});

it('uses an environment specific favicon outside production', function (string $environment, string $encodedColor) {
    app()->instance('env', $environment);

    $response = $this->get('/');

    $response->assertOk()
        ->assertSee('data:image/svg+xml', false)
        ->assertSee($encodedColor, false)
        ->assertDontSee('/favicons/favicon.svg', false)
        ->assertDontSee('/favicons/favicon.ico', false);
})->with([
    'local' => ['local', '%23f59e0b'],
    'staging' => ['staging', '%23ef4444'],
]);

it('keeps the default favicon in production', function () {
    app()->instance('env', 'production');

    $response = $this->get('/');

    $response->assertOk()
        ->assertSee('/favicons/favicon-96x96.png', false)
        ->assertSee('/favicons/favicon.svg', false)
        ->assertSee('/favicons/favicon.ico', false)
        ->assertDontSee('data:image/svg+xml', false);
});
