<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Room\StoreRoomMapRequest;
use App\Http\Requests\Room\StoreRoomRequest;
use App\Http\Requests\Room\UpdateRoomMapRequest;
use App\Http\Requests\Room\UpdateRoomRequest;
use App\Models\Room;
use App\Models\RoomMap;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class RoomController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user && $user->is_admin, 403);

        $roomMaps = RoomMap::query()
            ->orderBy('id')
            ->get(['id', 'name', 'image_path', 'grid_columns', 'grid_rows']);

        $mapId = $request->query('map');
        $activeMapId = $mapId ? (int) $mapId : ($roomMaps->first()->id ?? null);

        $roomMap = $activeMapId
            ? RoomMap::query()
                ->with([
                    'rooms' => fn ($query) => $query->orderBy('name'),
                    'rooms.character' => fn ($query) => $query->select('id', 'name', 'avatar', 'user_id'),
                    'rooms.assets' => fn ($query) => $query->orderBy('z_index'),
                ])
                ->find($activeMapId)
            : null;

        if ($roomMap && $user && ! $user->is_admin) {
            $roomMap->setRelation(
                'rooms',
                $roomMap->rooms->map(function ($room) use ($user) {
                    if ($room->character?->user_id !== $user->id) {
                        $room->setRelation('assets', collect());
                    }

                    return $room;
                }),
            );
        }

        $characters = $user && $user->is_admin
            ? DB::table('characters')
                ->leftJoin('users', 'users.id', '=', 'characters.user_id')
                ->whereNull('characters.deleted_at')
                ->orderBy('characters.name')
                ->select([
                    'characters.id',
                    'characters.name',
                    'characters.avatar',
                    'characters.guild_status',
                    'users.name as user_name',
                ])
                ->get()
            : collect();

        return Inertia::render('admin/rooms', [
            'roomMaps' => $roomMaps,
            'roomMap' => $roomMap,
            'characters' => $characters,
            'adminMode' => true,
        ]);
    }

    public function store(StoreRoomRequest $request): RedirectResponse
    {
        Room::query()->create($request->validated());

        return redirect()->back();
    }

    public function storeMap(StoreRoomMapRequest $request): RedirectResponse
    {
        $payload = $request->validated();
        $path = $request->file('image')->store('room-maps', 'public');

        $map = RoomMap::query()->create([
            'name' => $payload['name'],
            'grid_columns' => $payload['grid_columns'],
            'grid_rows' => $payload['grid_rows'],
            'image_path' => Storage::url($path),
        ]);

        return redirect()->route('admin.rooms.index', ['map' => $map->id]);
    }

    public function updateMap(UpdateRoomMapRequest $request, RoomMap $roomMap): RedirectResponse
    {
        $payload = $request->validated();
        $updates = [
            'name' => $payload['name'],
            'grid_columns' => $payload['grid_columns'],
            'grid_rows' => $payload['grid_rows'],
        ];

        if ($request->file('image')) {
            $path = $request->file('image')->store('room-maps', 'public');
            $updates['image_path'] = Storage::url($path);
        }

        $roomMap->update($updates);

        return redirect()->route('admin.rooms.index', ['map' => $roomMap->id]);
    }

    public function update(UpdateRoomRequest $request, Room $room): RedirectResponse
    {
        $room->update($request->validated());

        return redirect()->back();
    }

    public function destroy(Request $request, Room $room): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $user->is_admin, 403);

        $room->delete();

        return redirect()->back();
    }

    public function destroyAssets(Request $request, Room $room): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $user->is_admin, 403);

        $room->load('assets');

        foreach ($room->assets as $asset) {
            if ($asset->file_path) {
                $relative = Str::after($asset->file_path, '/storage/');
                if ($relative !== $asset->file_path) {
                    Storage::disk('public')->delete($relative);
                }
            }
        }

        $room->assets()->delete();

        return redirect()->back();
    }
}
