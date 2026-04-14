<?php

namespace App\Http\Requests\Shop;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateShopSettingRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->input('post_channel_id') === '') {
            $this->merge([
                'post_channel_id' => null,
                'post_channel_name' => null,
                'post_channel_type' => null,
                'post_channel_guild_id' => null,
                'post_channel_is_thread' => null,
            ]);
        }

        if ($this->input('auto_post_time') === '') {
            $this->merge([
                'auto_post_time' => null,
            ]);
        }
    }

    public function authorize(): bool
    {
        $user = Auth::user();

        return (bool) ($user?->is_admin ?? false);
    }

    public function rules(): array
    {
        return [
            'post_channel_id' => ['sometimes', 'nullable', 'string', 'regex:/^[0-9]{5,}$/'],
            'post_channel_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'post_channel_type' => ['sometimes', 'nullable', 'string', 'max:50'],
            'post_channel_guild_id' => ['sometimes', 'nullable', 'string', 'regex:/^[0-9]{5,}$/'],
            'post_channel_is_thread' => ['sometimes', 'nullable', 'boolean'],
            'auto_post_enabled' => ['sometimes', 'boolean'],
            'auto_post_weekday' => ['sometimes', 'integer', 'between:0,6'],
            'auto_post_time' => ['sometimes', 'nullable', 'date_format:H:i'],
            'roll_rules' => ['sometimes', 'array', 'min:1'],
            'roll_rules.*.id' => ['nullable', 'integer'],
            'roll_rules.*.row_kind' => ['required_with:roll_rules', Rule::in(['heading', 'rule'])],
            'roll_rules.*.rarity' => ['required_with:roll_rules', Rule::in(['common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact', 'unknown_rarity'])],
            'roll_rules.*.selection_types' => ['required_with:roll_rules', 'array', 'min:1'],
            'roll_rules.*.selection_types.*' => ['required_with:roll_rules', Rule::in(['weapon', 'armor', 'item', 'consumable', 'spellscroll'])],
            'roll_rules.*.source_kind' => ['required_with:roll_rules', Rule::in(['all', 'official', 'partnered'])],
            'roll_rules.*.heading_title' => ['nullable', 'string', 'max:255'],
            'roll_rules.*.count' => ['required_with:roll_rules', 'integer', 'min:0', 'max:50'],
            'roll_rules.*.sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'line_template' => ['sometimes', 'nullable', 'string', 'max:500'],
            'auto_roll_after_publish' => ['sometimes', 'boolean'],
            'keep_previous_post' => ['sometimes', 'boolean'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $rules = $this->input('roll_rules');

                if (! is_array($rules)) {
                    return;
                }

                foreach ($rules as $index => $rule) {
                    if (! is_array($rule)) {
                        continue;
                    }

                    $rowKind = (string) ($rule['row_kind'] ?? '');
                    $headingTitle = trim((string) ($rule['heading_title'] ?? ''));

                    if ($rowKind === 'heading' && $headingTitle === '') {
                        $validator->errors()->add("roll_rules.{$index}.heading_title", 'Heading rows need a title.');
                    }
                }
            },
        ];
    }
}
