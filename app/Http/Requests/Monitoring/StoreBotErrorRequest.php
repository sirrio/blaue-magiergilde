<?php

namespace App\Http\Requests\Monitoring;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBotErrorRequest extends FormRequest
{
    public function authorize(): bool
    {
        $token = env('BOT_HTTP_TOKEN');

        if (empty($token)) {
            return false;
        }

        $provided = $this->bearerToken();

        return is_string($provided) && hash_equals($token, $provided);
    }

    public function rules(): array
    {
        return [
            'source' => ['required', 'string', Rule::in([
                'uncaught_exception',
                'unhandled_rejection',
                'discord_client_error',
                'interaction_error',
                'message_error',
                'operation_error',
            ])],
            'message' => ['required', 'string', 'max:2000'],
            'stack'   => ['nullable', 'string', 'max:20000'],
            'context' => ['nullable', 'array'],
        ];
    }
}
