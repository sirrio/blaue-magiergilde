<?php

namespace App\Http\Requests\Room;

use Illuminate\Foundation\Http\FormRequest;

class StoreRoomAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user();
    }

    public function rules(): array
    {
        return [
            'image' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:10240'],
            'pos_x' => ['nullable', 'numeric'],
            'pos_y' => ['nullable', 'numeric'],
            'scale' => ['nullable', 'numeric', 'min:0.1', 'max:5'],
            'scale_x' => ['nullable', 'numeric', 'min:0.1', 'max:5'],
            'scale_y' => ['nullable', 'numeric', 'min:0.1', 'max:5'],
            'rotation' => ['nullable', 'numeric', 'min:-360', 'max:360'],
            'z_index' => ['nullable', 'integer'],
        ];
    }
}
