<?php

namespace App\Http\Requests\Monitoring;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFrontendErrorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'source' => ['required', 'string', Rule::in([
                'window_error',
                'unhandled_rejection',
                'react_error_boundary',
                'fetch_response_error',
                'fetch_network_error',
                'inertia_invalid_response',
                'inertia_exception',
                'ssr_render_error',
            ])],
            'message' => ['required', 'string', 'max:2000'],
            'stack' => ['nullable', 'string', 'max:20000'],
            'component' => ['nullable', 'string', 'max:255'],
            'url' => ['nullable', 'string', 'max:2048'],
            'file' => ['nullable', 'string', 'max:2048'],
            'line' => ['nullable', 'integer', 'min:0'],
            'column' => ['nullable', 'integer', 'min:0'],
            'context' => ['nullable', 'array'],
        ];
    }
}
