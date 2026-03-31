<?php

namespace App\Http\Requests\Room;

use Illuminate\Foundation\Http\FormRequest;

class CopyRoomMapRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user && $user->is_admin;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'grid_columns' => ['required', 'integer', 'min:1', 'max:200'],
            'grid_rows' => ['required', 'integer', 'min:1', 'max:200'],
        ];
    }
}
