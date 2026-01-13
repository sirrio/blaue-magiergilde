<?php

namespace App\Http\Controllers;

use App\Http\Requests\Room\StoreRoomAssetRequest;
use App\Http\Requests\Room\StoreRoomAssetLibraryRequest;
use App\Http\Requests\Room\UpdateRoomAssetRequest;
use App\Models\Room;
use App\Models\RoomAsset;
use App\Models\RoomMap;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class RoomAssetController extends Controller
{
    public function store(StoreRoomAssetRequest $request, Room $room): RedirectResponse
    {
        $user = $request->user();
        $this->authorizeRoomOwner($user, $room);

        $file = $request->file('image');
        if (! $file) {
            return redirect()->back();
        }

        $path = $file->store('room-assets', 'public');
        $filePath = Storage::url($path);
        $size = $file->getSize();
        $mimeType = $file->getMimeType();
        $originalName = $file->getClientOriginalName();
        [$width, $height] = $this->resolveImageSize($file->getPathname());

        $position = $this->resolveInitialPosition($request, $room);
        $zIndex = (int) RoomAsset::query()->where('room_id', $room->id)->max('z_index');

        RoomAsset::query()->create([
            'room_id' => $room->id,
            'user_id' => $user?->id,
            'source' => 'upload',
            'library_path' => null,
            'file_path' => $filePath,
            'original_name' => $originalName,
            'mime_type' => $mimeType,
            'size' => $size,
            'width' => $width,
            'height' => $height,
            'pos_x' => $position['pos_x'],
            'pos_y' => $position['pos_y'],
            'scale' => $position['scale'],
            'scale_x' => $position['scale_x'],
            'scale_y' => $position['scale_y'],
            'rotation' => $position['rotation'],
            'z_index' => $position['z_index'] ?? ($zIndex + 1),
        ]);

        return redirect()->back();
    }

    public function storeFromLibrary(StoreRoomAssetLibraryRequest $request, Room $room)
    {
        $user = $request->user();
        $this->authorizeRoomOwner($user, $room);

        $libraryPath = $this->resolveLibraryPath($request);
        if (! $libraryPath) {
            return response()->json(['message' => 'Library asset not found.'], 404);
        }

        $disk = Storage::disk('room_library');
        $path = $disk->path($libraryPath);
        [$width, $height] = $this->resolveImageSize($path);
        $size = $disk->size($libraryPath);
        $mimeType = $disk->mimeType($libraryPath);
        $originalName = basename($libraryPath);

        $position = $this->resolveInitialPosition($request, $room);
        $zIndex = (int) RoomAsset::query()->where('room_id', $room->id)->max('z_index');

        $asset = RoomAsset::query()->create([
            'room_id' => $room->id,
            'user_id' => $user?->id,
            'source' => 'library',
            'library_path' => $libraryPath,
            'file_path' => route('rooms.assets.library.show', ['path' => $libraryPath]),
            'original_name' => $originalName,
            'mime_type' => $mimeType,
            'size' => $size,
            'width' => $width,
            'height' => $height,
            'pos_x' => $position['pos_x'],
            'pos_y' => $position['pos_y'],
            'scale' => $position['scale'],
            'scale_x' => $position['scale_x'],
            'scale_y' => $position['scale_y'],
            'rotation' => $position['rotation'],
            'z_index' => $position['z_index'] ?? ($zIndex + 1),
        ]);

        if ($request->expectsJson()) {
            return response()->json(['id' => $asset->id], 201);
        }

        return redirect()->back();
    }

    public function update(UpdateRoomAssetRequest $request, RoomAsset $roomAsset): RedirectResponse|Response
    {
        $user = $request->user();
        $room = $roomAsset->room;
        $this->authorizeRoomOwner($user, $room);

        $payload = $request->validated();

        $roomAsset->pos_x = $payload['pos_x'];
        $roomAsset->pos_y = $payload['pos_y'];
        $scale = $payload['scale'] ?? $roomAsset->scale ?? 1;
        $scaleX = $payload['scale_x'] ?? $roomAsset->scale_x ?? $scale;
        $scaleY = $payload['scale_y'] ?? $roomAsset->scale_y ?? $scale;
        $roomAsset->scale = ($scaleX + $scaleY) / 2;
        $roomAsset->scale_x = $scaleX;
        $roomAsset->scale_y = $scaleY;
        $roomAsset->rotation = $payload['rotation'];
        if (array_key_exists('locked', $payload)) {
            $roomAsset->locked = (bool) $payload['locked'];
        }
        if (array_key_exists('z_index', $payload)) {
            $roomAsset->z_index = $payload['z_index'];
        }
        $roomAsset->save();

        if ($request->expectsJson()) {
            return response()->noContent();
        }

        return redirect()->back();
    }

    public function destroy(Request $request, RoomAsset $roomAsset): RedirectResponse
    {
        $user = $request->user();
        $room = $roomAsset->room;
        $this->authorizeRoomOwner($user, $room);

        if ($roomAsset->file_path) {
            $relative = Str::after($roomAsset->file_path, '/storage/');
            if ($relative !== $roomAsset->file_path) {
                Storage::disk('public')->delete($relative);
            }
        }

        $roomAsset->delete();

        return redirect()->back();
    }

    private function authorizeRoomOwner(?User $user, Room $room): void
    {
        if (! $user) {
            abort(403);
        }

        $character = $room->character;
        if ($character && $character->user_id === $user->id) {
            return;
        }

        abort(403);
    }

    private function resolveInitialPosition(StoreRoomAssetRequest|StoreRoomAssetLibraryRequest $request, Room $room): array
    {
        $payload = $request->validated();
        $scale = $payload['scale'] ?? 1;
        $scaleX = $payload['scale_x'] ?? $scale;
        $scaleY = $payload['scale_y'] ?? $scale;
        $rotation = $payload['rotation'] ?? 0;
        $posX = $payload['pos_x'] ?? null;
        $posY = $payload['pos_y'] ?? null;

        if ($posX !== null && $posY !== null) {
            return [
                'pos_x' => $posX,
                'pos_y' => $posY,
                'scale' => $scale,
                'scale_x' => $scaleX,
                'scale_y' => $scaleY,
                'rotation' => $rotation,
                'z_index' => $payload['z_index'] ?? null,
            ];
        }

        $map = $room->map;
        if (! $map || ! $map->image_path) {
            return [
                'pos_x' => 0,
                'pos_y' => 0,
                'scale' => $scale,
                'scale_x' => $scaleX,
                'scale_y' => $scaleY,
                'rotation' => $rotation,
                'z_index' => $payload['z_index'] ?? null,
            ];
        }

        [$mapWidth, $mapHeight] = $this->resolveMapSize($map);
        if (! $mapWidth || ! $mapHeight) {
            return [
                'pos_x' => 0,
                'pos_y' => 0,
                'scale' => $scale,
                'scale_x' => $scaleX,
                'scale_y' => $scaleY,
                'rotation' => $rotation,
                'z_index' => $payload['z_index'] ?? null,
            ];
        }

        $cellWidth = $mapWidth / max(1, $map->grid_columns);
        $cellHeight = $mapHeight / max(1, $map->grid_rows);
        $centerX = ($room->grid_x + $room->grid_w / 2) * $cellWidth;
        $centerY = ($room->grid_y + $room->grid_h / 2) * $cellHeight;

        return [
            'pos_x' => $centerX,
            'pos_y' => $centerY,
            'scale' => $scale,
            'scale_x' => $scaleX,
            'scale_y' => $scaleY,
            'rotation' => $rotation,
            'z_index' => $payload['z_index'] ?? null,
        ];
    }

    private function resolveMapSize(RoomMap $map): array
    {
        $relative = Str::after($map->image_path ?? '', '/storage/');
        if ($relative === $map->image_path) {
            return [null, null];
        }

        $path = Storage::disk('public')->path($relative);
        return $this->resolveImageSize($path);
    }

    private function resolveImageSize(string $path): array
    {
        if (! file_exists($path)) {
            return [null, null];
        }

        $size = @getimagesize($path);
        if (! $size) {
            return [null, null];
        }

        return [$size[0] ?? null, $size[1] ?? null];
    }

    private function resolveLibraryPath(StoreRoomAssetLibraryRequest $request): ?string
    {
        $path = str_replace('\\', '/', $request->validated('library_path'));
        if (Str::contains($path, '..')) {
            return null;
        }

        if (! Str::startsWith($path, 'room-library/')) {
            return null;
        }

        $extension = Str::lower(pathinfo($path, PATHINFO_EXTENSION));
        if (! in_array($extension, ['png', 'jpg', 'jpeg', 'webp'], true)) {
            return null;
        }

        $absolute = base_path('resources/assets/'.$path);
        if (! file_exists($absolute)) {
            return null;
        }

        return $path;
    }
}
