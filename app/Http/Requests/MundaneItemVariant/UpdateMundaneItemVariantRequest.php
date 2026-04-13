<?php

namespace App\Http\Requests\MundaneItemVariant;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class UpdateMundaneItemVariantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) Auth::user()?->is_admin;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'slug' => ['required', 'string', 'max:255', Rule::unique('mundane_item_variants', 'slug')->ignore($this->route('mundane_item_variant'))],
            'category' => 'required|in:weapon,armor',
            'cost_gp' => 'nullable|numeric|min:0',
            'is_placeholder' => 'boolean',
            'sort_order' => 'integer|min:0',
        ];
    }
}
