<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class PostDiscordLinesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->is_admin;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'channel_id' => trim((string) $this->input('channel_id', '')),
            'lines' => str_replace("\r\n", "\n", (string) $this->input('lines', '')),
        ]);
    }

    public function rules(): array
    {
        return [
            'channel_id' => ['required', 'string', 'regex:/^[0-9]{5,}$/'],
            'lines' => ['required', 'string', 'max:8000'],
        ];
    }

    public function messages(): array
    {
        return [
            'channel_id.required' => 'Bitte wähle einen Discord-Channel oder Thread aus.',
            'channel_id.regex' => 'Der ausgewählte Discord-Channel ist ungültig.',
            'lines.required' => 'Bitte füge mindestens eine Zeile ein.',
            'lines.max' => 'Der Text ist zu lang. Teile ihn auf mehrere Durchläufe auf.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $lines = $this->preparedLines();

            if ($lines === []) {
                $validator->errors()->add('lines', 'Bitte füge mindestens eine nicht-leere Zeile ein.');
            }

            if (count($lines) > 100) {
                $validator->errors()->add('lines', 'Es können maximal 100 Zeilen auf einmal gepostet werden.');
            }

            foreach ($lines as $index => $line) {
                if (mb_strlen($line) > 2000) {
                    $validator->errors()->add(
                        'lines',
                        sprintf('Zeile %d ist zu lang. Discord erlaubt maximal 2000 Zeichen pro Nachricht.', $index + 1)
                    );

                    break;
                }
            }
        });
    }

    /**
     * @return list<string>
     */
    public function preparedLines(): array
    {
        $rawLines = preg_split('/\n/u', (string) $this->input('lines', '')) ?: [];

        return collect($rawLines)
            ->map(fn (string $line) => trim($line))
            ->filter(fn (string $line) => $line !== '')
            ->values()
            ->all();
    }
}
