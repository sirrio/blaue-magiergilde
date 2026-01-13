<?php

namespace App\Support;

use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class RoomAssetLibrary
{
    private const ROOT_PREFIX = 'room-library/';

    public function index(bool $refresh = false): array
    {
        $cacheKey = 'room_asset_library.index.v2';
        if ($refresh) {
            Cache::forget($cacheKey);
        }

        return Cache::remember($cacheKey, now()->addHours(6), function () {
            return $this->buildIndex();
        });
    }

    private function buildIndex(): array
    {
        $root = base_path('resources/assets/room-library');
        if (! is_dir($root)) {
            return ['items' => [], 'categories' => []];
        }

        $items = [];
        $allowed = ['png', 'jpg', 'jpeg', 'webp'];

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            if (! $file->isFile()) {
                continue;
            }

            $extension = Str::lower($file->getExtension());
            if (! in_array($extension, $allowed, true)) {
                continue;
            }

            $absolute = $file->getPathname();
            $relative = self::ROOT_PREFIX.Str::replace('\\', '/', Str::after($absolute, $root.DIRECTORY_SEPARATOR));
            $folder = Str::replace('\\', '/', Str::after($file->getPath(), $root));
            $folder = ltrim($folder, '/');

            $categoryKey = $folder !== '' ? $folder : 'Unsorted';
            $categoryLabel = Str::of($categoryKey)
                ->replace(['_', '-'], ' ')
                ->replace('/', ' / ')
                ->squish()
                ->toString();

            $label = Str::of(pathinfo($file->getFilename(), PATHINFO_FILENAME))
                ->replace(['_', '-'], ' ')
                ->squish()
                ->toString();

            $items[] = [
                'path' => $relative,
                'label' => $label,
                'category' => $categoryKey,
                'category_label' => $categoryLabel,
            ];
        }

        $items = Arr::sort($items, function ($item) {
            return strtolower($item['label']);
        });

        $categories = collect($items)
            ->pluck('category_label', 'category')
            ->unique()
            ->map(function ($label, $key) {
                return [
                    'key' => $key,
                    'label' => $label,
                ];
            })
            ->values()
            ->sortBy('label')
            ->values()
            ->all();

        return ['items' => array_values($items), 'categories' => $categories];
    }
}
