<?php

namespace App\Http\Requests\Character;

use App\Models\Character;
use App\Models\CharacterClass;
use App\Rules\ExternalCharacterLink;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Collection;

/**
 * @property array $class
 * @property mixed $external_link
 * @property mixed $name
 * @property mixed $version
 * @property mixed $faction
 * @property mixed $notes
 */
class UpdateCharacterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $character = $this->route('character');
        if (! $character instanceof Character) {
            return false;
        }

        $userId = $this->user()?->getAuthIdentifier();

        return $userId && $character->user_id === $userId;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string',
            'class' => ['required', 'array', 'min:1', function (string $attribute, mixed $value, \Closure $fail): void {
                if (! is_array($value)) {
                    return;
                }

                $selectedClassIds = collect($value)
                    ->map(fn (mixed $classId) => (int) $classId)
                    ->filter(fn (int $classId) => $classId > 0);

                $invalidClassIds = $selectedClassIds->diff($this->allowedCharacterClassIds());

                if ($invalidClassIds->isNotEmpty()) {
                    $fail('One or more selected classes are not allowed in the guild.');
                }
            }],
            'class.*' => 'integer|exists:character_classes,id',
            'external_link' => ['required', 'url', new ExternalCharacterLink],
            'version' => 'required|string',
            'is_filler' => 'required|boolean',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ];
    }

    /**
     * @return Collection<int, int>
     */
    private function allowedCharacterClassIds(): Collection
    {
        $enabledClassIds = CharacterClass::query()
            ->where('guild_enabled', true)
            ->pluck('id')
            ->map(fn (mixed $id) => (int) $id);

        $character = $this->route('character');
        if (! $character instanceof Character) {
            return $enabledClassIds;
        }

        $currentClassIds = $character->characterClasses()
            ->pluck('character_classes.id')
            ->map(fn (mixed $id) => (int) $id);

        return $enabledClassIds
            ->merge($currentClassIds)
            ->unique()
            ->values();
    }
}
