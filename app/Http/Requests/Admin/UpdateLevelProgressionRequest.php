<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateLevelProgressionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user && $user->is_admin;
    }

    public function rules(): array
    {
        return [
            'entries' => ['required', 'array', 'size:20'],
            'entries.*.level' => ['required', 'integer', 'min:1', 'max:20', 'distinct'],
            'entries.*.required_bubbles' => ['required', 'integer', 'min:0', 'max:5000'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $entries = $this->input('entries', []);

                if (! is_array($entries)) {
                    return;
                }

                usort($entries, fn (array $a, array $b): int => (int) $a['level'] <=> (int) $b['level']);

                $expectedLevel = 1;
                $previousRequiredBubbles = null;

                foreach ($entries as $entry) {
                    $level = (int) ($entry['level'] ?? 0);
                    $requiredBubbles = (int) ($entry['required_bubbles'] ?? 0);

                    if ($level !== $expectedLevel) {
                        $validator->errors()->add('entries', 'Levels must contain every value from 1 to 20 exactly once.');

                        return;
                    }

                    if ($level === 1 && $requiredBubbles !== 0) {
                        $validator->errors()->add('entries.0.required_bubbles', 'Level 1 must require exactly 0 bubbles.');

                        return;
                    }

                    if ($previousRequiredBubbles !== null && $requiredBubbles <= $previousRequiredBubbles) {
                        $validator->errors()->add('entries', 'Required bubbles must strictly increase from one level to the next.');

                        return;
                    }

                    $previousRequiredBubbles = $requiredBubbles;
                    $expectedLevel++;
                }
            },
        ];
    }
}
