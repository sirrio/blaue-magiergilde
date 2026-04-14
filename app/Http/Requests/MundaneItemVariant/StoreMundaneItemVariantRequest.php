<?php

namespace App\Http\Requests\MundaneItemVariant;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class StoreMundaneItemVariantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) Auth::user()?->is_admin;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:mundane_item_variants,slug',
            'category' => 'required|in:weapon,armor',
            'cost_gp' => 'nullable|numeric|min:0',
            'is_placeholder' => 'boolean',
            'guild_enabled' => 'boolean',
        ];
    }
}
