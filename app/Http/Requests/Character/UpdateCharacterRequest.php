<?php

namespace App\Http\Requests\Character;

use App\Models\Character;
use App\Rules\ExternalCharacterLink;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @property array $class
 * @property mixed $external_link
 * @property mixed $name
 * @property mixed $version
 * @property mixed $dm_bubbles
 * @property mixed $dm_coins
 * @property mixed $bubble_shop_spend
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
            'class' => 'required|array|min:1',
            'class.*' => 'integer|exists:character_classes,id',
            'external_link' => ['required', 'url', new ExternalCharacterLink],
            'version' => 'required|string',
            'dm_bubbles' => 'required|integer|min:0|max:1024',
            'dm_coins' => 'required|integer|min:0|max:1024',
            'is_filler' => 'required|boolean',
            'bubble_shop_spend' => 'required|integer|min:0|max:1024',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ];
    }
}
