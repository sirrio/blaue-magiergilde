<?php

namespace App\Http\Controllers\Monitoring;

use App\Exceptions\BotErrorReportedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Monitoring\StoreBotErrorRequest;
use Illuminate\Http\JsonResponse;

class BotErrorController extends Controller
{
    public function __invoke(StoreBotErrorRequest $request): JsonResponse
    {
        $source  = $request->input('source', 'unknown');
        $message = trim((string) $request->input('message', 'Unknown bot error'));
        $stack   = $request->input('stack');
        $context = $request->input('context', []);

        $formattedMessage = sprintf('[bot][%s] %s', $source, $message);

        $exception = new BotErrorReportedException($formattedMessage, array_filter([
            'source'  => $source,
            'stack'   => $stack,
            'context' => $context ?: null,
        ], static fn (mixed $v): bool => $v !== null && $v !== [] && $v !== ''));

        report($exception);

        return response()->json(['status' => 'reported']);
    }
}
