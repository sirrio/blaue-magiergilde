<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ApplyCompendiumImportRequest;
use App\Http\Requests\Admin\PreviewCompendiumImportRequest;
use App\Models\CompendiumImportRun;
use App\Services\CompendiumImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

class CompendiumImportController extends Controller
{
    private const CACHE_PREFIX = 'compendium_import_preview:';

    public function template(Request $request, CompendiumImportService $service): StreamedResponse
    {
        $entityType = (string) $request->query('entity_type', '');
        if (! in_array($entityType, $service->supportedEntityTypes(), true)) {
            throw new HttpException(422, 'Invalid entity type.');
        }

        $filename = $entityType.'-template.csv';
        $content = $service->templateFor($entityType);

        return response()->streamDownload(function () use ($content) {
            echo $content;
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function preview(PreviewCompendiumImportRequest $request, CompendiumImportService $service): JsonResponse
    {
        $data = $request->validated();
        $entityType = (string) $data['entity_type'];
        $file = $request->file('file');

        $preview = $service->preview($entityType, $file);
        $token = (string) Str::uuid();

        Cache::put(self::CACHE_PREFIX.$token, [
            'entity_type' => $entityType,
            'filename' => $file->getClientOriginalName(),
            'summary' => $preview['summary'],
            'rows' => $preview['import_rows'],
            'error_samples' => $preview['error_samples'],
        ], now()->addMinutes(30));

        return response()->json([
            'preview_token' => $token,
            'entity_type' => $entityType,
            'filename' => $file->getClientOriginalName(),
            'summary' => $preview['summary'],
            'row_samples' => $preview['row_samples'],
            'error_samples' => $preview['error_samples'],
        ]);
    }

    public function apply(ApplyCompendiumImportRequest $request, CompendiumImportService $service): JsonResponse
    {
        $token = (string) $request->validated()['preview_token'];
        $cacheKey = self::CACHE_PREFIX.$token;
        $cached = Cache::pull($cacheKey);

        if (! is_array($cached)) {
            throw new HttpException(422, 'Preview expired. Please upload again.');
        }

        $entityType = (string) ($cached['entity_type'] ?? '');
        $rows = is_array($cached['rows'] ?? null) ? $cached['rows'] : [];
        $filename = (string) ($cached['filename'] ?? 'import.csv');
        $summaryFromPreview = is_array($cached['summary'] ?? null) ? $cached['summary'] : [];
        $errorSamples = is_array($cached['error_samples'] ?? null) ? $cached['error_samples'] : [];

        $result = $service->apply($entityType, $rows);
        $invalidRows = (int) ($summaryFromPreview['invalid_rows'] ?? 0);
        $totalRows = (int) ($summaryFromPreview['total_rows'] ?? ($result['total_rows'] + $invalidRows));

        $run = CompendiumImportRun::query()->create([
            'user_id' => $request->user()?->id,
            'entity_type' => $entityType,
            'filename' => $filename,
            'total_rows' => $totalRows,
            'new_rows' => $result['new_rows'],
            'updated_rows' => $result['updated_rows'],
            'unchanged_rows' => $result['unchanged_rows'],
            'invalid_rows' => $invalidRows,
            'error_samples' => array_slice($errorSamples, 0, 20),
            'applied_at' => now(),
        ]);

        return response()->json([
            'run_id' => $run->id,
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
