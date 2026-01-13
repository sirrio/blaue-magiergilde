<?php

namespace App\Http\Requests\Room;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRoomAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user();
    }

    public function rules(): array
    {
        return [
            'pos_x' => ['required', 'numeric'],
            'pos_y' => ['required', 'numeric'],
            'scale' => ['nullable', 'numeric', 'min:0.1', 'max:5'],
            'scale_x' => ['nullable', 'numeric', 'min:0.1', 'max:5'],
            'scale_y' => ['nullable', 'numeric', 'min:0.1', 'max:5'],
            'rotation' => ['required', 'numeric', 'min:-360', 'max:360'],
            'z_index' => ['nullable', 'integer'],
        ];
    }
}
