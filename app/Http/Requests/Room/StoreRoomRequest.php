<?php

namespace App\Http\Requests\Room;

use App\Models\Room;
use App\Models\RoomMap;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Validator;

class StoreRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = Auth::user();

        return (bool) ($user?->is_admin);
    }

    public function rules(): array
    {
        return [
            'room_map_id' => ['required', 'integer', 'exists:room_maps,id'],
            'name' => ['required', 'string', 'max:120'],
            'grid_x' => ['required', 'integer', 'min:0'],
            'grid_y' => ['required', 'integer', 'min:0'],
            'grid_w' => ['required', 'integer', 'min:1'],
            'grid_h' => ['required', 'integer', 'min:1'],
            'character_id' => ['nullable', 'integer', 'exists:characters,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $mapId = (int) $this->input('room_map_id');
            $map = RoomMap::query()->find($mapId);
            if (! $map) {
                return;
            }

            $x = (int) $this->input('grid_x');
            $y = (int) $this->input('grid_y');
            $w = (int) $this->input('grid_w');
            $h = (int) $this->input('grid_h');

            if ($x + $w > $map->grid_columns || $y + $h > $map->grid_rows) {
                $validator->errors()->add('grid_x', 'Room selection exceeds the map bounds.');
            }

            $characterId = $this->input('character_id');
            if ($characterId) {
                $existing = Room::query()
                    ->where('character_id', $characterId)
                    ->exists();
                if ($existing) {
                    $validator->errors()->add('character_id', 'Character already has a room.');
                }
            }
        });
    }
}
