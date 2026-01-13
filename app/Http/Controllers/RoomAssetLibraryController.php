<?php

namespace App\Http\Controllers;

use App\Support\RoomAssetLibrary;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RoomAssetLibraryController extends Controller
{
    public function index(Request $request, RoomAssetLibrary $library)
    {
        $refresh = $request->boolean('refresh') && $request->user()?->is_admin;
        $data = $library->index($refresh);

        $category = $request->string('category')->toString();
        $search = Str::lower($request->string('search')->toString());
        $page = max((int) $request->input('page', 1), 1);
        $perPage = (int) $request->input('per_page', 24);
        $perPage = max(6, min($perPage, 60));

        $items = collect($data['items']);

        if ($category !== '') {
            $items = $items->where('category', $category);
        }

        if ($search !== '') {
            $items = $items->filter(function ($item) use ($search) {
                $label = Str::lower($item['label'] ?? '');
                $categoryLabel = Str::lower($item['category_label'] ?? '');
                return Str::contains($label, $search) || Str::contains($categoryLabel, $search);
            });
        }

        $total = $items->count();
        $items = $items->slice(($page - 1) * $perPage, $perPage)->values();

        $items = $items->map(function ($item) {
            $item['url'] = route('rooms.assets.library.show', ['path' => $item['path']]);
            return $item;
        });

        return response()->json([
            'items' => $items,
            'categories' => $data['categories'],
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
        ]);
    }

    public function show(Request $request)
    {
        $path = str_replace('\\', '/', (string) $request->query('path'));
        if ($path === '' || Str::contains($path, '..')) {
            abort(404);
        }

        if (! Str::startsWith($path, 'room-library/')) {
            abort(404);
        }

        $extension = Str::lower(pathinfo($path, PATHINFO_EXTENSION));
        if (! in_array($extension, ['png', 'jpg', 'jpeg', 'webp'], true)) {
            abort(404);
        }

        $filePath = base_path('resources/assets/'.$path);
        if (! file_exists($filePath)) {
            abort(404);
        }

        return response()->file($filePath);
    }
}
