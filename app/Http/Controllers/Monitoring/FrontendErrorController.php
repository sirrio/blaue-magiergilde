<?php

namespace App\Http\Controllers\Monitoring;

use App\Http\Controllers\Controller;
use App\Http\Requests\Monitoring\StoreFrontendErrorRequest;
use App\Services\FrontendErrorReporter;
use Illuminate\Http\JsonResponse;

class FrontendErrorController extends Controller
{
    public function __invoke(
        StoreFrontendErrorRequest $request,
        FrontendErrorReporter $frontendErrorReporter,
    ): JsonResponse {
        $reported = $frontendErrorReporter->ingest($request->validated(), $request);

        return response()->json([
            'status' => $reported ? 'reported' : 'ignored',
        ]);
    }
}
