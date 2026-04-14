<?php

namespace App\Support;

class ShopLineRenderer
{
    public const DEFAULT_TEMPLATE = '{item_link}{spell_part}{legacy_part}: {item_cost}';

    /**
     * Render a shop item line using the given template (or the default).
     *
     * Available variables:
     *   {item_link}        [Name](<url>) — or plain name if no URL
     *   {item_name}        Plain item name (includes notes if present)
     *   {item_cost}        Cost string e.g. "500 gp"
     *   {notes}            Notes string (empty string if none)
     *   {spell_link}       [SpellName](<url>) (empty if no spell)
     *   {spell_name}       Plain spell name (empty if no spell)
     *   {spell_legacy_link} [Legacy](<url>) (empty if no differing legacy URL)
     *   {spell_part}       " - [SpellName](<url>)" incl. separator (empty if no spell)
     *   {legacy_part}      " - [Legacy](<url>)" incl. separator (empty if no legacy diff)
     *   {source_label}     Human-readable source kind e.g. "Official", "Partnered" (empty if none/all)
     *   {source_shortcode} Source book shortcode e.g. "PHB", "XGE" (empty if not set)
     *
     * @param  array<string, mixed>  $item
     */
    public static function render(array $item, ?string $template = null): string
    {
        $template = $template ?? self::DEFAULT_TEMPLATE;

        $name = (string) ($item['item_name'] ?? $item['name'] ?? '');
        $url = (string) ($item['item_url'] ?? $item['url'] ?? '');
        $cost = (string) ($item['item_cost'] ?? $item['cost'] ?? '');
        $notes = trim((string) ($item['notes'] ?? ''));

        $itemName = $notes !== '' ? "{$name} - {$notes}" : $name;
        $itemLink = $url !== '' ? "[{$itemName}](<{$url}>)" : $itemName;

        $spellId = $item['spell_id'] ?? null;
        $spellName = (string) ($item['spell_name'] ?? '');
        $spellUrl = (string) ($item['spell_url'] ?? '');
        $spellLegacyUrl = (string) ($item['spell_legacy_url'] ?? '');

        $spellLink = '';
        $spellPart = '';
        $spellLegacyLink = '';
        $legacyPart = '';

        if ($spellId && $spellName !== '') {
            $primaryUrl = $spellUrl !== '' ? $spellUrl : $spellLegacyUrl;
            $spellLink = $primaryUrl !== '' ? "[{$spellName}](<{$primaryUrl}>)" : $spellName;
            $spellPart = " - {$spellLink}";

            if ($spellLegacyUrl !== '' && $spellLegacyUrl !== $primaryUrl) {
                $spellLegacyLink = "[Legacy](<{$spellLegacyUrl}>)";
                $legacyPart = " - {$spellLegacyLink}";
            }
        }

        $sourceKind = (string) ($item['roll_source_kind'] ?? $item['source_kind'] ?? '');
        $sourceLabel = match ($sourceKind) {
            'official' => 'Official',
            'partnered' => 'Partnered',
            default => '',
        };
        $sourceShortcode = (string) ($item['source_shortcode'] ?? '');

        return strtr($template, [
            '{item_link}' => $itemLink,
            '{item_name}' => $itemName,
            '{item_cost}' => $cost,
            '{notes}' => $notes,
            '{spell_link}' => $spellLink,
            '{spell_name}' => $spellName,
            '{spell_legacy_link}' => $spellLegacyLink,
            '{spell_part}' => $spellPart,
            '{legacy_part}' => $legacyPart,
            '{source_label}' => $sourceLabel,
            '{source_shortcode}' => $sourceShortcode,
        ]);
    }
}
