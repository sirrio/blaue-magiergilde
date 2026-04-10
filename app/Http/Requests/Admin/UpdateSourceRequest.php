<?php

namespace App\Http\Requests\Admin;

use App\Models\Source;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class UpdateSourceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = Auth::user();

        return (bool) ($user?->is_admin);
    }

    protected function prepareForValidation(): void
    {
        $name = trim((string) $this->input('name', ''));
        $shortcode = strtoupper(trim((string) $this->input('shortcode', '')));

        $this->merge([
            'name' => $name,
            'shortcode' => $shortcode,
            'kind' => trim((string) $this->input('kind', 'third_party')),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Source|null $source */
        $source = $this->route('source');

        return [
            'name' => ['required', 'string', 'max:120'],
            'shortcode' => [
                'required',
                'string',
                'max:32',
                'regex:/^[A-Z0-9_-]+$/',
                Rule::unique('sources', 'shortcode')->ignore($source?->id),
            ],
            'kind' => ['required', Rule::in(['official', 'third_party'])],
        ];
    }
}
