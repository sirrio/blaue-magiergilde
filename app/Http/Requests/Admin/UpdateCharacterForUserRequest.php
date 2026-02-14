<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCharacterForUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return (bool) $this->user()?->is_admin;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string',
            'class' => 'required|array|min:1',
            'class.*' => 'integer|exists:character_classes,id',
            'external_link' => 'required|url',
            'start_tier' => 'required|in:bt,lt,ht',
            'version' => 'required|string',
            'dm_bubbles' => 'required|integer|min:0|max:1024',
            'dm_coins' => 'required|integer|min:0|max:1024',
            'is_filler' => 'required|boolean',
            'bubble_shop_spend' => 'required|integer|min:0|max:1024',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'guild_status' => 'nullable|in:pending,draft',
            'faction' => 'nullable|string',
            'notes' => 'nullable|string',
        ];
    }
}
