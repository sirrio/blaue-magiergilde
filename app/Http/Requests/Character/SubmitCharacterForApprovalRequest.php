<?php

namespace App\Http\Requests\Character;

use App\Models\Character;
use App\Support\CharacterActivityRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class SubmitCharacterForApprovalRequest extends FormRequest
{
    public function authorize(): bool
    {
        $character = $this->route('character');
        if (! $character instanceof Character) {
            return false;
        }

        $userId = $this->user()?->getAuthIdentifier();

        return $userId && $character->user_id === $userId;
    }

    public function rules(): array
    {
        return [
            'registration_note' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $character = $this->route('character');
                if (! $character instanceof Character) {
                    return;
                }

                if (! in_array($character->guild_status, ['draft', 'needs_changes'], true)) {
                    return;
                }

                $activityRule = app(CharacterActivityRule::class);
                if ($activityRule->blocksFillerSubmission($character)) {
                    $validator->errors()->add(
                        'guild_status',
                        'You already have a submitted filler character. Retire or resolve it before submitting another.',
                    );

                    return;
                }

                if (! $activityRule->blocksSubmission($character)) {
                    return;
                }

                $validator->errors()->add(
                    'guild_status',
                    sprintf(
                        'You already have %d active characters. Retire one before submitting another.',
                        $activityRule->maxActiveCharacters(),
                    ),
                );
            },
        ];
    }
}
