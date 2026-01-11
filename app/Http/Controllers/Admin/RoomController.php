<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Room\StoreRoomRequest;
use App\Http\Requests\Room\UpdateRoomRequest;
use App\Models\Room;
use App\Models\RoomMap;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
                ])
                ->find($activeMapId)
            : null;

        $characters = DB::table('characters')
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
            ->get();

        return Inertia::render('admin/rooms', [
            'roomMaps' => $roomMaps,
            'roomMap' => $roomMap,
            'characters' => $characters,
        ]);
    }

    public function store(StoreRoomRequest $request): RedirectResponse
    {
        Room::query()->create($request->validated());

        return redirect()->back();
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
}
