<?php

namespace App\Http\Requests\Character;

use Illuminate\Foundation\Http\FormRequest;

class UpgradeCharacterProgressionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'level' => ['required', 'integer', 'min:1', 'max:20'],
            'bubbles_in_level' => ['nullable', 'integer', 'min:0', 'max:99'],
            'allow_outside_range_without_downtime' => ['sometimes', 'boolean'],
        ];
    }
}
