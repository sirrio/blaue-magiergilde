<?php

namespace App\Http\Controllers;

use App\Models\RoomMap;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RoomController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

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

        if ($roomMap && $user) {
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

        return Inertia::render('rooms', [
            'roomMaps' => $roomMaps,
            'roomMap' => $roomMap,
            'characters' => collect(),
            'adminMode' => false,
        ]);
    }
}
