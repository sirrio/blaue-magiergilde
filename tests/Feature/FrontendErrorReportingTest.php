<?php

use App\Exceptions\FrontendErrorReportedException;
use App\Models\User;
use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('reports accepted frontend errors through the exception handler', function () {
    $this->mock(ExceptionHandler::class, function ($mock) {
        $mock->shouldReceive('report')
            ->once()
            ->with(\Mockery::on(function (mixed $exception): bool {
                return $exception instanceof FrontendErrorReportedException
                    && str_contains($exception->getMessage(), '[frontend][window_error]')
                    && ($exception->context()['component'] ?? null) === 'characters.index'
                    && ($exception->context()['line'] ?? null) === 27;
            }));
    });

    $response = $this->postJson(route('monitoring.frontend-errors.store'), [
        'source' => 'window_error',
        'message' => 'Cannot read properties of undefined',
        'component' => 'characters.index',
        'url' => 'https://blaue-magiergilde.test/characters',
        'file' => 'https://blaue-magiergilde.test/build/assets/app.js',
        'line' => 27,
        'column' => 14,
        'stack' => 'TypeError: Cannot read properties of undefined',
    ]);

    $response->assertOk()
        ->assertJson([
            'status' => 'reported',
        ]);
});

it('accepts ssr render error reports without csrf token', function () {
    $response = $this->post(route('monitoring.frontend-errors.store'), [
        'source' => 'ssr_render_error',
        'message' => 'SSR render failed',
        'component' => 'characters.index',
        'url' => 'https://blaue-magiergilde.test/characters',
    ], [
        'Accept' => 'application/json',
    ]);

    $response->assertOk()
        ->assertJson([
            'status' => 'reported',
        ]);
});

it('ignores noisy browser errors', function () {
    $this->mock(ExceptionHandler::class, function ($mock) {
        $mock->shouldNotReceive('report');
    });

    $response = $this->postJson(route('monitoring.frontend-errors.store'), [
        'source' => 'window_error',
        'message' => 'ResizeObserver loop limit exceeded',
    ]);

    $response->assertOk()
        ->assertJson([
            'status' => 'ignored',
        ]);
});

it('accepts reports even when the user still needs to accept privacy consent', function () {
    $this->mock(ExceptionHandler::class, function ($mock) {
        $mock->shouldReceive('report')
            ->once();
    });

    $user = User::factory()->create([
        'privacy_policy_accepted_at' => null,
        'privacy_policy_accepted_version' => null,
    ]);

    $response = $this->actingAs($user)->postJson(route('monitoring.frontend-errors.store'), [
        'source' => 'unhandled_rejection',
        'message' => 'Failed to load page data',
    ]);

    $response->assertOk()
        ->assertJson([
            'status' => 'reported',
        ]);
});
