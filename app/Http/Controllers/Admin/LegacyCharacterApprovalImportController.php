<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ApplyLegacyCharacterApprovalImportRequest;
use App\Http\Requests\Admin\PreviewLegacyCharacterApprovalImportRequest;
use App\Services\LegacyCharacterApprovalImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class LegacyCharacterApprovalImportController extends Controller
{
    private const CACHE_PREFIX = 'legacy_character_approval_import_preview:';

    public function preview(
        PreviewLegacyCharacterApprovalImportRequest $request,
        LegacyCharacterApprovalImportService $service,
    ): JsonResponse {
        $file = $request->file('file');
        $preview = $service->preview($file);
        $token = (string) Str::uuid();

        Cache::put(self::CACHE_PREFIX.$token, [
            'filename' => $file->getClientOriginalName(),
            'summary' => $preview['summary'],
            'rows' => $preview['import_rows'],
            'error_samples' => $preview['error_samples'],
        ], now()->addMinutes(30));

        return response()->json([
            'preview_token' => $token,
            'filename' => $file->getClientOriginalName(),
            'summary' => $preview['summary'],
            'row_samples' => $preview['row_samples'],
            'error_samples' => $preview['error_samples'],
        ]);
    }

    public function apply(
        ApplyLegacyCharacterApprovalImportRequest $request,
        LegacyCharacterApprovalImportService $service,
    ): JsonResponse {
        $token = (string) $request->validated()['preview_token'];
        $cached = Cache::pull(self::CACHE_PREFIX.$token);

        if (! is_array($cached)) {
            throw new HttpException(422, 'Preview expired. Please upload again.');
        }

        $rows = is_array($cached['rows'] ?? null) ? $cached['rows'] : [];
        if ($rows === []) {
            throw new HttpException(422, 'Preview contains no valid rows.');
        }

        $summaryFromPreview = is_array($cached['summary'] ?? null) ? $cached['summary'] : [];
        $result = $service->apply($rows);
        $invalidRows = (int) ($summaryFromPreview['invalid_rows'] ?? 0);
        $totalRows = (int) ($summaryFromPreview['total_rows'] ?? ($result['total_rows'] + $invalidRows));

        return response()->json([
            'summary' => [
                'total_rows' => $totalRows,
                'new_rows' => $result['new_rows'],
                'updated_rows' => $result['updated_rows'],
                'unchanged_rows' => $result['unchanged_rows'],
                'invalid_rows' => $invalidRows,
            ],
        ]);
    }
}
