<?php

namespace App\Http\Requests\Character;

use App\Models\Character;
use App\Support\CharacterBubbleShop;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateCharacterBubbleShopRequest extends FormRequest
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
            CharacterBubbleShop::TYPE_SKILL_PROFICIENCY => 'required|integer|min:0|max:1',
            CharacterBubbleShop::TYPE_RARE_LANGUAGE => 'required|integer|min:0|max:1',
            CharacterBubbleShop::TYPE_TOOL_OR_LANGUAGE => 'required|integer|min:0|max:3',
            CharacterBubbleShop::TYPE_DOWNTIME => 'required|integer|min:0',
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

                $bubbleShop = app(CharacterBubbleShop::class);

                foreach (CharacterBubbleShop::purchaseTypes() as $type) {
                    $value = $this->integer($type);
                    $max = $bubbleShop->maxQuantity($character, $type);

                    if ($max !== null && $value > $max) {
                        $validator->errors()->add($type, $this->maxMessageFor($type, $max));
                    }
                }

                $maxEffectiveSpend = $bubbleShop->maxEffectiveSpendWithoutDownlevel($character);
                if ($maxEffectiveSpend === null) {
                    return;
                }

                $quantities = [];
                foreach (CharacterBubbleShop::purchaseTypes() as $type) {
                    $quantities[$type] = max(0, $this->integer($type));
                }

                if ($bubbleShop->effectiveSpendForQuantities($character, $quantities) > $maxEffectiveSpend) {
                    $validator->errors()->add(
                        'bubble_shop',
                        'Bubble-Shop-Ausgaben duerfen den Charakter nicht unter sein aktuelles Level druecken.',
                    );
                }
            },
        ];
    }

    private function maxMessageFor(string $type, int $max): string
    {
        return match ($type) {
            CharacterBubbleShop::TYPE_DOWNTIME => $max === 0
                ? 'Downtime ist erst ab LT verfuegbar.'
                : "Maximal {$max} Downtime-Kaeufe erlaubt.",
            CharacterBubbleShop::TYPE_TOOL_OR_LANGUAGE => 'Maximal 3 Tool-/Sprach-Kaeufe erlaubt.',
            CharacterBubbleShop::TYPE_SKILL_PROFICIENCY => 'Skill Prof kann nur einmal gekauft werden.',
            CharacterBubbleShop::TYPE_RARE_LANGUAGE => 'Rare Language kann nur einmal gekauft werden.',
            default => 'Ungueltiger Bubble-Shop-Wert.',
        };
    }
}
