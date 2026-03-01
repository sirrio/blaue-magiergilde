<?php

use App\Support\BotRequestFailure;
use GuzzleHttp\Psr7\Response as Psr7Response;
use Illuminate\Http\Client\Response as HttpResponse;

it('marks timeout exceptions as retryable background work', function () {
    $result = BotRequestFailure::fromThrowable(new RuntimeException('cURL error 28: Operation timed out after 10003 milliseconds'));

    expect($result['status'])->toBe(503)
        ->and($result['timed_out'])->toBeTrue()
        ->and($result['error'])->toContain('did not respond in time')
        ->and($result['error'])->toContain('check Discord, then retry if needed');
});

it('adds retry-after hints for http responses', function () {
    $response = new HttpResponse(new Psr7Response(
        429,
        ['Content-Type' => 'application/json'],
        json_encode([
            'error' => 'Too many requests.',
            'retry_after_ms' => 3200,
        ], JSON_THROW_ON_ERROR),
    ));

    $result = BotRequestFailure::fromResponse($response);

    expect($result['status'])->toBe(429)
        ->and($result['timed_out'])->toBeFalse()
        ->and($result['retry_after_seconds'])->toBe(4)
        ->and($result['error'])->toContain('Retry after 4s.');
});

it('adds timeout recovery guidance for timeout-like bot responses', function () {
    $response = new HttpResponse(new Psr7Response(
        504,
        ['Content-Type' => 'application/json'],
        json_encode([
            'error' => 'Operation timed out while waiting for Discord.',
        ], JSON_THROW_ON_ERROR),
    ));

    $result = BotRequestFailure::fromResponse($response);

    expect($result['timed_out'])->toBeTrue()
        ->and($result['error'])->toContain('may still finish in the background');
});
