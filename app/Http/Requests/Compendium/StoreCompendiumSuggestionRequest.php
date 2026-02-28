<?php

namespace App\Http\Requests\Compendium;

use App\Models\CompendiumSuggestion;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class StoreCompendiumSuggestionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Auth::check();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'kind' => 'required|string|in:'.implode(',', [
                CompendiumSuggestion::KIND_ITEM,
                CompendiumSuggestion::KIND_SPELL,
            ]),
            'target_id' => [
                Rule::requiredIf(fn (): bool => (string) $this->input('kind') === CompendiumSuggestion::KIND_SPELL),
                'nullable',
                'integer',
                'min:1',
            ],
            'source_url' => 'nullable|url|max:2048',
            'notes' => 'nullable|string|max:2000',
            'changes' => 'nullable|array',
        ];
    }
}
