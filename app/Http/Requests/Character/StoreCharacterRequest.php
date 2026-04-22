<?php

namespace App\Http\Requests\Character;

use App\Models\CharacterClass;
use App\Rules\ExternalCharacterLink;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Collection;

/**
 * @property string $name
 * @property array $class
 * @property mixed $start_tier
 * @property mixed $version
 * @property mixed $external_link
 * @property mixed $dm_bubbles
 * @property mixed $dm_coins
 * @property mixed $bubble_shop_spend
 * @property mixed $is_filler
 * @property mixed $faction
 * @property mixed $notes
 */
class StoreCharacterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
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
            'start_tier' => 'required|in:bt,lt,ht',
            'version' => 'required|string',
            'dm_bubbles' => 'required|integer|min:0|max:1024',
            'dm_coins' => 'required|integer|min:0|max:1024',
            'is_filler' => 'required|boolean',
            'bubble_shop_spend' => 'sometimes|integer|min:0|max:1024',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ];
    }

    /**
     * @return Collection<int, int>
     */
    private function allowedCharacterClassIds(): Collection
    {
        return CharacterClass::query()
            ->where('guild_enabled', true)
            ->pluck('id')
            ->map(fn (mixed $id) => (int) $id);
    }
}
