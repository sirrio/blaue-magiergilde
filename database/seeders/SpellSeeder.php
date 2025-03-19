<?php

namespace Database\Seeders;

use App\Models\Spell;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SpellSeeder extends Seeder
{
  public function run(): void
  {
    $spells = [
      [
        "name" => "Abi-Dalzim's Horrid Wilting",
        "url" => "https://www.dndbeyond.com/spells/2367-abi-dalzims-horrid-wilting",
        "legacy_url" => null,
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "8th"
      ],
      [
        "name" => "Absorb Elements",
        "url" => "https://www.dndbeyond.com/spells/2368-absorb-elements",
        "legacy_url" => null,
        "spell_school" => "abjuration",
        "components" => "S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Acid Arrow",
        "url" => null,
        "legacy_url" => "https://www.dndbeyond.com/spells/1988-acid-arrow",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Acid Splash",
        "url" => "https://www.dndbeyond.com/spells/2618844-acid-splash",
        "legacy_url" => "https://www.dndbeyond.com/spells/1989-acid-splash",
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Aganazzar's Scorcher",
        "url" => "https://www.dndbeyond.com/spells/2369-aganazzars-scorcher",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Aid",
        "url" => "https://www.dndbeyond.com/spells/2618845-aid",
        "legacy_url" => "https://www.dndbeyond.com/spells/1990-aid",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Air Bubble",
        "url" => "https://www.dndbeyond.com/spells/1585025-air-bubble",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Alarm",
        "url" => "https://www.dndbeyond.com/spells/2619222-alarm",
        "legacy_url" => "https://www.dndbeyond.com/spells/1991-alarm",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Alter Self",
        "url" => "https://www.dndbeyond.com/spells/2618846-alter-self",
        "legacy_url" => "https://www.dndbeyond.com/spells/1992-alter-self",
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Animal Friendship",
        "url" => "https://www.dndbeyond.com/spells/2618847-animal-friendship",
        "legacy_url" => "https://www.dndbeyond.com/spells/1993-animal-friendship",
        "spell_school" => "enchantment",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Animal Messenger",
        "url" => "https://www.dndbeyond.com/spells/2618850-animal-messenger",
        "legacy_url" => "https://www.dndbeyond.com/spells/1994-animal-messenger",
        "spell_school" => "enchantment",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Animal Shapes",
        "url" => "https://www.dndbeyond.com/spells/2618851-animal-shapes",
        "legacy_url" => "https://www.dndbeyond.com/spells/1995-animal-shapes",
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "8th"
      ],
      [
        "name" => "Animate Dead",
        "url" => "https://www.dndbeyond.com/spells/2618853-animate-dead",
        "legacy_url" => "https://www.dndbeyond.com/spells/1996-animate-dead",
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Circle of Power",
        "url" => "https://www.dndbeyond.com/spells/2618970-circle-of-power",
        "legacy_url" => "https://www.dndbeyond.com/spells/2353-circle-of-power",
        "spell_school" => "abjuration",
        "components" => "V",
        "spell_level" => "5th"
      ],
      [
        "name" => "Clairvoyance",
        "url" => "https://www.dndbeyond.com/spells/2618972-clairvoyance",
        "legacy_url" => "https://www.dndbeyond.com/spells/2028-clairvoyance",
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Clone",
        "url" => "https://www.dndbeyond.com/spells/2618973-clone",
        "legacy_url" => "https://www.dndbeyond.com/spells/2029-clone",
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "8th"
      ],
      [
        "name" => "Cloud of Daggers",
        "url" => "https://www.dndbeyond.com/spells/2618974-cloud-of-daggers",
        "legacy_url" => "https://www.dndbeyond.com/spells/2327-cloud-of-daggers",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Cloudkill",
        "url" => "https://www.dndbeyond.com/spells/2618976-cloudkill",
        "legacy_url" => "https://www.dndbeyond.com/spells/2030-cloudkill",
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "5th"
      ],
      [
        "name" => "Color Spray",
        "url" => "https://www.dndbeyond.com/spells/2618978-color-spray",
        "legacy_url" => "https://www.dndbeyond.com/spells/2031-color-spray",
        "spell_school" => "illusion",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Command",
        "url" => "https://www.dndbeyond.com/spells/2618985-command",
        "legacy_url" => "https://www.dndbeyond.com/spells/2032-command",
        "spell_school" => "enchantment",
        "components" => "V",
        "spell_level" => "1st"
      ],
      [
        "name" => "Commune",
        "url" => "https://www.dndbeyond.com/spells/2618987-commune",
        "legacy_url" => "https://www.dndbeyond.com/spells/2033-commune",
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Commune with Nature",
        "url" => "https://www.dndbeyond.com/spells/2618989-commune-with-nature",
        "legacy_url" => "https://www.dndbeyond.com/spells/2034-commune-with-nature",
        "spell_school" => "divination",
        "components" => "V, S",
        "spell_level" => "5th"
      ],
      [
        "name" => "Compelled Duel",
        "url" => "https://www.dndbeyond.com/spells/2618990-compelled-duel",
        "legacy_url" => "https://www.dndbeyond.com/spells/2313-compelled-duel",
        "spell_school" => "enchantment",
        "components" => "V",
        "spell_level" => "1st"
      ],
      [
        "name" => "Comprehend Languages",
        "url" => "https://www.dndbeyond.com/spells/2618993-comprehend-languages",
        "legacy_url" => "https://www.dndbeyond.com/spells/2035-comprehend-languages",
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Compulsion",
        "url" => "https://www.dndbeyond.com/spells/2619041-compulsion",
        "legacy_url" => "https://www.dndbeyond.com/spells/2036-compulsion",
        "spell_school" => "enchantment",
        "components" => "V, S",
        "spell_level" => "4th"
      ],
      [
        "name" => "Cone of Cold",
        "url" => "https://www.dndbeyond.com/spells/2619042-cone-of-cold",
        "legacy_url" => "https://www.dndbeyond.com/spells/2037-cone-of-cold",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Confusion",
        "url" => "https://www.dndbeyond.com/spells/2619043-confusion",
        "legacy_url" => "https://www.dndbeyond.com/spells/2038-confusion",
        "spell_school" => "enchantment",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Conjure Animals",
        "url" => "https://www.dndbeyond.com/spells/2619044-conjure-animals",
        "legacy_url" => "https://www.dndbeyond.com/spells/2039-conjure-animals",
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Conjure Barrage",
        "url" => "https://www.dndbeyond.com/spells/2619045-conjure-barrage",
        "legacy_url" => "https://www.dndbeyond.com/spells/2335-conjure-barrage",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Conjure Celestial",
        "url" => "https://www.dndbeyond.com/spells/2619046-conjure-celestial",
        "legacy_url" => "https://www.dndbeyond.com/spells/2040-conjure-celestial",
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "7th"
      ],
      [
        "name" => "Conjure Elemental",
        "url" => "https://www.dndbeyond.com/spells/2619047-conjure-elemental",
        "legacy_url" => "https://www.dndbeyond.com/spells/2041-conjure-elemental",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Conjure Fey",
        "url" => "https://www.dndbeyond.com/spells/2619048-conjure-fey",
        "legacy_url" => "https://www.dndbeyond.com/spells/2042-conjure-fey",
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "6th"
      ],
      [
        "name" => "Conjure Minor Elementals",
        "url" => "https://www.dndbeyond.com/spells/2619049-conjure-minor-elementals",
        "legacy_url" => "https://www.dndbeyond.com/spells/2043-conjure-minor-elementals",
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "4th"
      ],
      [
        "name" => "Conjure the Deep Haze",
        "url" => "https://www.dndbeyond.com/spells/2221547-conjure-the-deep-haze",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Banishment",
        "url" => "https://www.dndbeyond.com/spells/2618906-banishment",
        "legacy_url" => "https://www.dndbeyond.com/spells/2010-banishment",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Barkskin",
        "url" => "https://www.dndbeyond.com/spells/2618907-barkskin",
        "legacy_url" => "https://www.dndbeyond.com/spells/2011-barkskin",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Beacon of Hope",
        "url" => "https://www.dndbeyond.com/spells/2618911-beacon-of-hope",
        "legacy_url" => "https://www.dndbeyond.com/spells/2012-beacon-of-hope",
        "spell_school" => "abjuration",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Beast Bond",
        "url" => "https://www.dndbeyond.com/spells/2370-beast-bond",
        "legacy_url" => null,
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Beast Sense",
        "url" => "https://www.dndbeyond.com/spells/2618914-beast-sense",
        "legacy_url" => "https://www.dndbeyond.com/spells/2325-beast-sense",
        "spell_school" => "divination",
        "components" => "S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Befuddlement",
        "url" => "https://www.dndbeyond.com/spells/2618832-befuddlement",
        "legacy_url" => null,
        "spell_school" => "enchantment",
        "components" => "V, S, M",
        "spell_level" => "8th"
      ],
      [
        "name" => "Bestow Curse",
        "url" => "https://www.dndbeyond.com/spells/2618923-bestow-curse",
        "legacy_url" => "https://www.dndbeyond.com/spells/2013-bestow-curse",
        "spell_school" => "necromancy",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Bigby's Hand",
        "url" => "https://www.dndbeyond.com/spells/2618928-bigbys-hand",
        "legacy_url" => "https://www.dndbeyond.com/spells/2352-bigbys-hand",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Black Tentacles",
        "url" => null,
        "legacy_url" => "https://www.dndbeyond.com/spells/2014-black-tentacles",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Blade Barrier",
        "url" => "https://www.dndbeyond.com/spells/2618929-blade-barrier",
        "legacy_url" => "https://www.dndbeyond.com/spells/2015-blade-barrier",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "6th"
      ],
      [
        "name" => "Blade of Disaster",
        "url" => "https://www.dndbeyond.com/spells/654072-blade-of-disaster",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "9th"
      ],
      [
        "name" => "Blade Ward",
        "url" => "https://www.dndbeyond.com/spells/2618931-blade-ward",
        "legacy_url" => "https://www.dndbeyond.com/spells/2307-blade-ward",
        "spell_school" => "abjuration",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Armor of Agathys",
        "url" => "https://www.dndbeyond.com/spells/2618870-armor-of-agathys",
        "legacy_url" => "https://www.dndbeyond.com/spells/2310-armor-of-agathys",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Arms of Hadar",
        "url" => "https://www.dndbeyond.com/spells/2618871-arms-of-hadar",
        "legacy_url" => "https://www.dndbeyond.com/spells/2311-arms-of-hadar",
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Ashardalon's Stride",
        "url" => "https://www.dndbeyond.com/spells/1183862-ashardalons-stride",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Astral Projection",
        "url" => "https://www.dndbeyond.com/spells/2618878-astral-projection",
        "legacy_url" => "https://www.dndbeyond.com/spells/2006-astral-projection",
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "9th"
      ],
      [
        "name" => "Augury",
        "url" => "https://www.dndbeyond.com/spells/2618882-augury",
        "legacy_url" => "https://www.dndbeyond.com/spells/2007-augury",
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Aura of Life",
        "url" => "https://www.dndbeyond.com/spells/2618884-aura-of-life",
        "legacy_url" => "https://www.dndbeyond.com/spells/2342-aura-of-life",
        "spell_school" => "abjuration",
        "components" => "V",
        "spell_level" => "4th"
      ],
      [
        "name" => "Aura of Purity",
        "url" => "https://www.dndbeyond.com/spells/2618888-aura-of-purity",
        "legacy_url" => "https://www.dndbeyond.com/spells/2343-aura-of-purity",
        "spell_school" => "abjuration",
        "components" => "V",
        "spell_level" => "4th"
      ],
      [
        "name" => "Aura of Vitality",
        "url" => "https://www.dndbeyond.com/spells/2618891-aura-of-vitality",
        "legacy_url" => "https://www.dndbeyond.com/spells/2333-aura-of-vitality",
        "spell_school" => "evocation",
        "components" => "V",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Awaken",
        "url" => "https://www.dndbeyond.com/spells/2618897-awaken",
        "legacy_url" => "https://www.dndbeyond.com/spells/2008-awaken",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Bane",
        "url" => "https://www.dndbeyond.com/spells/2618900-bane",
        "legacy_url" => "https://www.dndbeyond.com/spells/2009-bane",
        "spell_school" => "enchantment",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Banishing Smite",
        "url" => "https://www.dndbeyond.com/spells/2618904-banishing-smite",
        "legacy_url" => "https://www.dndbeyond.com/spells/2351-banishing-smite",
        "spell_school" => "abjuration",
        "components" => "V",
        "spell_level" => "5th"
      ],
      [
        "name" => "Bless",
        "url" => "https://www.dndbeyond.com/spells/2618933-bless",
        "legacy_url" => "https://www.dndbeyond.com/spells/2016-bless",
        "spell_school" => "enchantment",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Blight",
        "url" => "https://www.dndbeyond.com/spells/2618934-blight",
        "legacy_url" => "https://www.dndbeyond.com/spells/2017-blight",
        "spell_school" => "necromancy",
        "components" => "V, S",
        "spell_level" => "4th"
      ],
      [
        "name" => "Blinding Smite",
        "url" => "https://www.dndbeyond.com/spells/2618936-blinding-smite",
        "legacy_url" => "https://www.dndbeyond.com/spells/2334-blinding-smite",
        "spell_school" => "evocation",
        "components" => "V",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Blindness/Deafness",
        "url" => "https://www.dndbeyond.com/spells/2618938-blindness-deafness",
        "legacy_url" => "https://www.dndbeyond.com/spells/2018-blindness-deafness",
        "spell_school" => "necromancy",
        "components" => "V",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Blink",
        "url" => "https://www.dndbeyond.com/spells/2618939-blink",
        "legacy_url" => "https://www.dndbeyond.com/spells/2019-blink",
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Blur",
        "url" => "https://www.dndbeyond.com/spells/2618945-blur",
        "legacy_url" => "https://www.dndbeyond.com/spells/2020-blur",
        "spell_school" => "illusion",
        "components" => "V",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Bones of the Earth",
        "url" => "https://www.dndbeyond.com/spells/2371-bones-of-the-earth",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "6th"
      ],
      [
        "name" => "Booming Blade",
        "url" => "https://www.dndbeyond.com/spells/2410-booming-blade",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "S, M",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Borrowed Knowledge",
        "url" => "https://www.dndbeyond.com/spells/1239802-borrowed-knowledge",
        "legacy_url" => null,
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Branding Smite",
        "url" => null,
        "legacy_url" => "https://www.dndbeyond.com/spells/2326-branding-smite",
        "spell_school" => "evocation",
        "components" => "V",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Burning Hands",
        "url" => "https://www.dndbeyond.com/spells/2618946-burning-hands",
        "legacy_url" => "https://www.dndbeyond.com/spells/2021-burning-hands",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Call Lightning",
        "url" => "https://www.dndbeyond.com/spells/2618949-call-lightning",
        "legacy_url" => "https://www.dndbeyond.com/spells/2022-call-lightning",
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Calm Emotions",
        "url" => "https://www.dndbeyond.com/spells/2618959-calm-emotions",
        "legacy_url" => "https://www.dndbeyond.com/spells/2023-calm-emotions",
        "spell_school" => "enchantment",
        "components" => "V, S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Catapult",
        "url" => "https://www.dndbeyond.com/spells/2372-catapult",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Catnap",
        "url" => "https://www.dndbeyond.com/spells/14754-catnap",
        "legacy_url" => null,
        "spell_school" => "enchantment",
        "components" => "S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Cause Fear",
        "url" => "https://www.dndbeyond.com/spells/14758-cause-fear",
        "legacy_url" => null,
        "spell_school" => "necromancy",
        "components" => "V",
        "spell_level" => "1st"
      ],
      [
        "name" => "Ceremony",
        "url" => "https://www.dndbeyond.com/spells/14760-ceremony",
        "legacy_url" => null,
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Chain Lightning",
        "url" => "https://www.dndbeyond.com/spells/2618960-chain-lightning",
        "legacy_url" => "https://www.dndbeyond.com/spells/2024-chain-lightning",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Chaos Bolt",
        "url" => "https://www.dndbeyond.com/spells/14761-chaos-bolt",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Charm Monster",
        "url" => "https://www.dndbeyond.com/spells/2618963-charm-monster",
        "legacy_url" => "https://www.dndbeyond.com/spells/14763-charm-monster",
        "spell_school" => "enchantment",
        "components" => "V, S",
        "spell_level" => "4th"
      ],
      [
        "name" => "Charm Person",
        "url" => "https://www.dndbeyond.com/spells/2618964-charm-person",
        "legacy_url" => "https://www.dndbeyond.com/spells/2025-charm-person",
        "spell_school" => "enchantment",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Chill Touch",
        "url" => "https://www.dndbeyond.com/spells/2618965-chill-touch",
        "legacy_url" => "https://www.dndbeyond.com/spells/2026-chill-touch",
        "spell_school" => "necromancy",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Chromatic Orb",
        "url" => "https://www.dndbeyond.com/spells/2618966-chromatic-orb",
        "legacy_url" => "https://www.dndbeyond.com/spells/2312-chromatic-orb",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Circle of Death",
        "url" => "https://www.dndbeyond.com/spells/2618969-circle-of-death",
        "legacy_url" => "https://www.dndbeyond.com/spells/2027-circle-of-death",
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Animate Objects",
        "url" => "https://www.dndbeyond.com/spells/2618855-animate-objects",
        "legacy_url" => "https://www.dndbeyond.com/spells/1997-animate-objects",
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "5th"
      ],
      [
        "name" => "Antagonize",
        "url" => "https://www.dndbeyond.com/spells/2158656-antagonize",
        "legacy_url" => null,
        "spell_school" => "enchantment",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Antilife Shell",
        "url" => "https://www.dndbeyond.com/spells/2618856-antilife-shell",
        "legacy_url" => "https://www.dndbeyond.com/spells/1998-antilife-shell",
        "spell_school" => "abjuration",
        "components" => "V, S",
        "spell_level" => "5th"
      ],
      [
        "name" => "Antimagic Field",
        "url" => "https://www.dndbeyond.com/spells/2618860-antimagic-field",
        "legacy_url" => "https://www.dndbeyond.com/spells/1999-antimagic-field",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "8th"
      ],
      [
        "name" => "Antipathy/Sympathy",
        "url" => "https://www.dndbeyond.com/spells/2618862-antipathy-sympathy",
        "legacy_url" => "https://www.dndbeyond.com/spells/2000-antipathy-sympathy",
        "spell_school" => "enchantment",
        "components" => "V, S, M",
        "spell_level" => "8th"
      ],
      [
        "name" => "Arcane Eye",
        "url" => "https://www.dndbeyond.com/spells/2618863-arcane-eye",
        "legacy_url" => "https://www.dndbeyond.com/spells/2001-arcane-eye",
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Arcane Gate",
        "url" => "https://www.dndbeyond.com/spells/2618865-arcane-gate",
        "legacy_url" => "https://www.dndbeyond.com/spells/2358-arcane-gate",
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "6th"
      ],
      [
        "name" => "Arcane Hand",
        "url" => null,
        "legacy_url" => "https://www.dndbeyond.com/spells/2002-arcane-hand",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Arcane Lock",
        "url" => "https://www.dndbeyond.com/spells/2618868-arcane-lock",
        "legacy_url" => "https://www.dndbeyond.com/spells/2003-arcane-lock",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Arcane Vigor",
        "url" => "https://www.dndbeyond.com/spells/2618831-arcane-vigor",
        "legacy_url" => null,
        "spell_school" => "abjuration",
        "components" => "V, S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Arcanist's Magic Aura",
        "url" => null,
        "legacy_url" => "https://www.dndbeyond.com/spells/2005-arcanists-magic-aura",
        "spell_school" => "illusion",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Dispel Magic",
        "url" => "https://www.dndbeyond.com/spells/2619103-dispel-magic",
        "legacy_url" => "https://www.dndbeyond.com/spells/2072-dispel-magic",
        "spell_school" => "abjuration",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Dissonant Whispers",
        "url" => "https://www.dndbeyond.com/spells/2619104-dissonant-whispers",
        "legacy_url" => "https://www.dndbeyond.com/spells/2314-dissonant-whispers",
        "spell_school" => "enchantment",
        "components" => "V",
        "spell_level" => "1st"
      ],
      [
        "name" => "Distort Value",
        "url" => "https://www.dndbeyond.com/spells/188092-distort-value",
        "legacy_url" => null,
        "spell_school" => "illusion",
        "components" => "V",
        "spell_level" => "1st"
      ],
      [
        "name" => "Divination",
        "url" => "https://www.dndbeyond.com/spells/2619140-divination",
        "legacy_url" => "https://www.dndbeyond.com/spells/2073-divination",
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Divine Favor",
        "url" => "https://www.dndbeyond.com/spells/2619142-divine-favor",
        "legacy_url" => "https://www.dndbeyond.com/spells/2074-divine-favor",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Divine Smite",
        "url" => "https://www.dndbeyond.com/spells/2618833-divine-smite",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V",
        "spell_level" => "1st"
      ],
      [
        "name" => "Divine Word",
        "url" => "https://www.dndbeyond.com/spells/2619144-divine-word",
        "legacy_url" => "https://www.dndbeyond.com/spells/2075-divine-word",
        "spell_school" => "evocation",
        "components" => "V",
        "spell_level" => "7th"
      ],
      [
        "name" => "Dominate Beast",
        "url" => "https://www.dndbeyond.com/spells/2619146-dominate-beast",
        "legacy_url" => "https://www.dndbeyond.com/spells/2076-dominate-beast",
        "spell_school" => "enchantment",
        "components" => "V, S",
        "spell_level" => "4th"
      ],
      [
        "name" => "Dominate Monster",
        "url" => "https://www.dndbeyond.com/spells/2619147-dominate-monster",
        "legacy_url" => "https://www.dndbeyond.com/spells/2077-dominate-monster",
        "spell_school" => "enchantment",
        "components" => "V, S",
        "spell_level" => "8th"
      ],
      [
        "name" => "Dominate Person",
        "url" => "https://www.dndbeyond.com/spells/2619148-dominate-person",
        "legacy_url" => "https://www.dndbeyond.com/spells/2078-dominate-person",
        "spell_school" => "enchantment",
        "components" => "V, S",
        "spell_level" => "5th"
      ],
      [
        "name" => "Draconic Transformation",
        "url" => "https://www.dndbeyond.com/spells/1183863-draconic-transformation",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "7th"
      ],
      [
        "name" => "Dragon's Breath",
        "url" => "https://www.dndbeyond.com/spells/2619150-dragons-breath",
        "legacy_url" => "https://www.dndbeyond.com/spells/14832-dragons-breath",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Find Greater Steed",
        "url" => "https://www.dndbeyond.com/spells/14871-find-greater-steed",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "4th"
      ],
      [
        "name" => "Find Steed",
        "url" => "https://www.dndbeyond.com/spells/2618879-find-steed",
        "legacy_url" => "https://www.dndbeyond.com/spells/2098-find-steed",
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Find the Path",
        "url" => "https://www.dndbeyond.com/spells/2618881-find-the-path",
        "legacy_url" => "https://www.dndbeyond.com/spells/2099-find-the-path",
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Find Traps",
        "url" => "https://www.dndbeyond.com/spells/2618883-find-traps",
        "legacy_url" => "https://www.dndbeyond.com/spells/2100-find-traps",
        "spell_school" => "divination",
        "components" => "V, S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Finger of Death",
        "url" => "https://www.dndbeyond.com/spells/2618885-finger-of-death",
        "legacy_url" => "https://www.dndbeyond.com/spells/2101-finger-of-death",
        "spell_school" => "necromancy",
        "components" => "V, S",
        "spell_level" => "7th"
      ],
      [
        "name" => "Fire Bolt",
        "url" => "https://www.dndbeyond.com/spells/2618890-fire-bolt",
        "legacy_url" => "https://www.dndbeyond.com/spells/2103-fire-bolt",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Fire Shield",
        "url" => "https://www.dndbeyond.com/spells/2618894-fire-shield",
        "legacy_url" => "https://www.dndbeyond.com/spells/2104-fire-shield",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Fire Storm",
        "url" => "https://www.dndbeyond.com/spells/2618896-fire-storm",
        "legacy_url" => "https://www.dndbeyond.com/spells/2105-fire-storm",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "7th"
      ],
      [
        "name" => "Fireball",
        "url" => "https://www.dndbeyond.com/spells/2618887-fireball",
        "legacy_url" => "https://www.dndbeyond.com/spells/2102-fireball",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Fizban's Platinum Shield",
        "url" => "https://www.dndbeyond.com/spells/1183864-fizbans-platinum-shield",
        "legacy_url" => null,
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Flame Arrows",
        "url" => "https://www.dndbeyond.com/spells/2381-flame-arrows",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Flame Blade",
        "url" => "https://www.dndbeyond.com/spells/2618899-flame-blade",
        "legacy_url" => "https://www.dndbeyond.com/spells/2106-flame-blade",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Crusader's Mantle",
        "url" => "https://www.dndbeyond.com/spells/2619057-crusaders-mantle",
        "legacy_url" => "https://www.dndbeyond.com/spells/2336-crusaders-mantle",
        "spell_school" => "evocation",
        "components" => "V",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Cure Wounds",
        "url" => "https://www.dndbeyond.com/spells/2619079-cure-wounds",
        "legacy_url" => "https://www.dndbeyond.com/spells/2056-cure-wounds",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Dancing Lights",
        "url" => "https://www.dndbeyond.com/spells/2619058-dancing-lights",
        "legacy_url" => "https://www.dndbeyond.com/spells/2057-dancing-lights",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Danse Macabre",
        "url" => "https://www.dndbeyond.com/spells/14830-danse-macabre",
        "legacy_url" => null,
        "spell_school" => "necromancy",
        "components" => "V, S",
        "spell_level" => "5th"
      ],
      [
        "name" => "Dark Star",
        "url" => "https://www.dndbeyond.com/spells/416800-dark-star",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "8th"
      ],
      [
        "name" => "Darkness",
        "url" => "https://www.dndbeyond.com/spells/2619080-darkness",
        "legacy_url" => "https://www.dndbeyond.com/spells/2058-darkness",
        "spell_school" => "evocation",
        "components" => "V, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Darkvision",
        "url" => "https://www.dndbeyond.com/spells/2619082-darkvision",
        "legacy_url" => "https://www.dndbeyond.com/spells/2059-darkvision",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Dawn",
        "url" => "https://www.dndbeyond.com/spells/14831-dawn",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Daylight",
        "url" => "https://www.dndbeyond.com/spells/2619083-daylight",
        "legacy_url" => "https://www.dndbeyond.com/spells/2060-daylight",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Death Ward",
        "url" => "https://www.dndbeyond.com/spells/2619085-death-ward",
        "legacy_url" => "https://www.dndbeyond.com/spells/2061-death-ward",
        "spell_school" => "abjuration",
        "components" => "V, S",
        "spell_level" => "4th"
      ],
      [
        "name" => "Delayed Blast Fireball",
        "url" => "https://www.dndbeyond.com/spells/2619086-delayed-blast-fireball",
        "legacy_url" => "https://www.dndbeyond.com/spells/2062-delayed-blast-fireball",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "7th"
      ],
      [
        "name" => "Delerium Blast",
        "url" => "https://www.dndbeyond.com/spells/2221550-delerium-blast",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Delerium Orb",
        "url" => "https://www.dndbeyond.com/spells/2221551-delerium-orb",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Flame Strike",
        "url" => "https://www.dndbeyond.com/spells/2618920-flame-strike",
        "legacy_url" => "https://www.dndbeyond.com/spells/2107-flame-strike",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Flaming Sphere",
        "url" => "https://www.dndbeyond.com/spells/2618919-flaming-sphere",
        "legacy_url" => "https://www.dndbeyond.com/spells/2108-flaming-sphere",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Flesh to Stone",
        "url" => "https://www.dndbeyond.com/spells/2618905-flesh-to-stone",
        "legacy_url" => "https://www.dndbeyond.com/spells/2109-flesh-to-stone",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Floating Disk",
        "url" => null,
        "legacy_url" => "https://www.dndbeyond.com/spells/2110-floating-disk",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Flock of Familiars",
        "url" => "https://www.dndbeyond.com/spells/92691-flock-of-familiars",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Fly",
        "url" => "https://www.dndbeyond.com/spells/2618909-fly",
        "legacy_url" => "https://www.dndbeyond.com/spells/2111-fly",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Fog Cloud",
        "url" => "https://www.dndbeyond.com/spells/2618910-fog-cloud",
        "legacy_url" => "https://www.dndbeyond.com/spells/2112-fog-cloud",
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Forbiddance",
        "url" => "https://www.dndbeyond.com/spells/2618913-forbiddance",
        "legacy_url" => "https://www.dndbeyond.com/spells/2113-forbiddance",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Forcecage",
        "url" => "https://www.dndbeyond.com/spells/2618916-forcecage",
        "legacy_url" => "https://www.dndbeyond.com/spells/2114-forcecage",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "7th"
      ],
      [
        "name" => "Forced Evolution",
        "url" => "https://www.dndbeyond.com/spells/2221552-forced-evolution",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Foresight",
        "url" => "https://www.dndbeyond.com/spells/2618918-foresight",
        "legacy_url" => "https://www.dndbeyond.com/spells/2115-foresight",
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "9th"
      ],
      [
        "name" => "Fortune's Favor",
        "url" => "https://www.dndbeyond.com/spells/176232-fortunes-favor",
        "legacy_url" => null,
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Fount of Moonlight",
        "url" => "https://www.dndbeyond.com/spells/2618835-fount-of-moonlight",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "4th"
      ],
      [
        "name" => "Freedom of Movement",
        "url" => "https://www.dndbeyond.com/spells/2618921-freedom-of-movement",
        "legacy_url" => "https://www.dndbeyond.com/spells/2116-freedom-of-movement",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Freedom of the Waves",
        "url" => "https://www.dndbeyond.com/spells/1343136-freedom-of-the-waves",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Freedom of the Winds",
        "url" => "https://www.dndbeyond.com/spells/1343171-freedom-of-the-winds",
        "legacy_url" => null,
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Freezing Sphere",
        "url" => null,
        "legacy_url" => "https://www.dndbeyond.com/spells/2117-freezing-sphere",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Friends",
        "url" => "https://www.dndbeyond.com/spells/2618924-friends",
        "legacy_url" => "https://www.dndbeyond.com/spells/2308-friends",
        "spell_school" => "enchantment",
        "components" => "S, M",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Frost Fingers",
        "url" => "https://www.dndbeyond.com/spells/654074-frost-fingers",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Frostbite",
        "url" => "https://www.dndbeyond.com/spells/2382-frostbite",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Galder's Speedy Courier",
        "url" => "https://www.dndbeyond.com/spells/92692-galders-speedy-courier",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Galder's Tower",
        "url" => "https://www.dndbeyond.com/spells/92693-galders-tower",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Gaseous Form",
        "url" => "https://www.dndbeyond.com/spells/2618927-gaseous-form",
        "legacy_url" => "https://www.dndbeyond.com/spells/2118-gaseous-form",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Gate",
        "url" => "https://www.dndbeyond.com/spells/2618932-gate",
        "legacy_url" => "https://www.dndbeyond.com/spells/2119-gate",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "9th"
      ],
      [
        "name" => "Gate Seal",
        "url" => "https://www.dndbeyond.com/spells/2119578-gate-seal",
        "legacy_url" => null,
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Geas",
        "url" => "https://www.dndbeyond.com/spells/2618940-geas",
        "legacy_url" => "https://www.dndbeyond.com/spells/2120-geas",
        "spell_school" => "enchantment",
        "components" => "V",
        "spell_level" => "5th"
      ],
      [
        "name" => "Cordon of Arrows",
        "url" => "https://www.dndbeyond.com/spells/2619055-cordon-of-arrows",
        "legacy_url" => "https://www.dndbeyond.com/spells/2328-cordon-of-arrows",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Counterspell",
        "url" => "https://www.dndbeyond.com/spells/2619072-counterspell",
        "legacy_url" => "https://www.dndbeyond.com/spells/2051-counterspell",
        "spell_school" => "abjuration",
        "components" => "S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Create Bonfire",
        "url" => "https://www.dndbeyond.com/spells/2373-create-bonfire",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Create Food and Water",
        "url" => "https://www.dndbeyond.com/spells/2619073-create-food-and-water",
        "legacy_url" => "https://www.dndbeyond.com/spells/2052-create-food-and-water",
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Create Homunculus",
        "url" => "https://www.dndbeyond.com/spells/14765-create-homunculus",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Create Magen",
        "url" => "https://www.dndbeyond.com/spells/654073-create-magen",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "7th"
      ],
      [
        "name" => "Create or Destroy Water",
        "url" => "https://www.dndbeyond.com/spells/2619074-create-or-destroy-water",
        "legacy_url" => "https://www.dndbeyond.com/spells/2053-create-or-destroy-water",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Create Spelljamming Helm",
        "url" => "https://www.dndbeyond.com/spells/1585026-create-spelljamming-helm",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Create Undead",
        "url" => "https://www.dndbeyond.com/spells/2619076-create-undead",
        "legacy_url" => "https://www.dndbeyond.com/spells/2054-create-undead",
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Creation",
        "url" => "https://www.dndbeyond.com/spells/2619077-creation",
        "legacy_url" => "https://www.dndbeyond.com/spells/2055-creation",
        "spell_school" => "illusion",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Crown of Madness",
        "url" => "https://www.dndbeyond.com/spells/2619056-crown-of-madness",
        "legacy_url" => "https://www.dndbeyond.com/spells/2329-crown-of-madness",
        "spell_school" => "enchantment",
        "components" => "V, S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Crown of Stars",
        "url" => "https://www.dndbeyond.com/spells/14827-crown-of-stars",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "7th"
      ],
      [
        "name" => "Gentle Repose",
        "url" => "https://www.dndbeyond.com/spells/2618942-gentle-repose",
        "legacy_url" => "https://www.dndbeyond.com/spells/2121-gentle-repose",
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Giant Insect",
        "url" => "https://www.dndbeyond.com/spells/2618944-giant-insect",
        "legacy_url" => "https://www.dndbeyond.com/spells/2122-giant-insect",
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "4th"
      ],
      [
        "name" => "Gift of Alacrity",
        "url" => "https://www.dndbeyond.com/spells/176233-gift-of-alacrity",
        "legacy_url" => null,
        "spell_school" => "divination",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Gift of Gab",
        "url" => "https://www.dndbeyond.com/spells/188118-gift-of-gab",
        "legacy_url" => null,
        "spell_school" => "enchantment",
        "components" => "V, S, M, R",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Glibness",
        "url" => "https://www.dndbeyond.com/spells/2618948-glibness",
        "legacy_url" => "https://www.dndbeyond.com/spells/2123-glibness",
        "spell_school" => "transmutation",
        "components" => "V",
        "spell_level" => "8th"
      ],
      [
        "name" => "Globe of Invulnerability",
        "url" => "https://www.dndbeyond.com/spells/2618950-globe-of-invulnerability",
        "legacy_url" => "https://www.dndbeyond.com/spells/2124-globe-of-invulnerability",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Glyph of Warding",
        "url" => "https://www.dndbeyond.com/spells/2618951-glyph-of-warding",
        "legacy_url" => "https://www.dndbeyond.com/spells/2125-glyph-of-warding",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Goodberry",
        "url" => "https://www.dndbeyond.com/spells/2618952-goodberry",
        "legacy_url" => "https://www.dndbeyond.com/spells/2126-goodberry",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Grasping Vine",
        "url" => "https://www.dndbeyond.com/spells/2618955-grasping-vine",
        "legacy_url" => "https://www.dndbeyond.com/spells/2345-grasping-vine",
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "4th"
      ],
      [
        "name" => "Gravity Fissure",
        "url" => "https://www.dndbeyond.com/spells/416801-gravity-fissure",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Gravity Sinkhole",
        "url" => "https://www.dndbeyond.com/spells/416802-gravity-sinkhole",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Grease",
        "url" => "https://www.dndbeyond.com/spells/2618957-grease",
        "legacy_url" => "https://www.dndbeyond.com/spells/2127-grease",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Greater Invisibility",
        "url" => "https://www.dndbeyond.com/spells/2618958-greater-invisibility",
        "legacy_url" => "https://www.dndbeyond.com/spells/2128-greater-invisibility",
        "spell_school" => "illusion",
        "components" => "V, S",
        "spell_level" => "4th"
      ],
      [
        "name" => "Greater Restoration",
        "url" => "https://www.dndbeyond.com/spells/2618961-greater-restoration",
        "legacy_url" => "https://www.dndbeyond.com/spells/2129-greater-restoration",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Green-Flame Blade",
        "url" => "https://www.dndbeyond.com/spells/2411-green-flame-blade",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "S, M",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Guardian of Faith",
        "url" => "https://www.dndbeyond.com/spells/2619135-guardian-of-faith",
        "legacy_url" => "https://www.dndbeyond.com/spells/2130-guardian-of-faith",
        "spell_school" => "conjuration",
        "components" => "V",
        "spell_level" => "4th"
      ],
      [
        "name" => "Guardian of Nature",
        "url" => "https://www.dndbeyond.com/spells/14872-guardian-of-nature",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V",
        "spell_level" => "4th"
      ],
      [
        "name" => "Guards and Wards",
        "url" => "https://www.dndbeyond.com/spells/2618968-guards-and-wards",
        "legacy_url" => "https://www.dndbeyond.com/spells/2131-guards-and-wards",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Guidance",
        "url" => "https://www.dndbeyond.com/spells/2618971-guidance",
        "legacy_url" => "https://www.dndbeyond.com/spells/2132-guidance",
        "spell_school" => "divination",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Guiding Bolt",
        "url" => "https://www.dndbeyond.com/spells/2619136-guiding-bolt",
        "legacy_url" => "https://www.dndbeyond.com/spells/2133-guiding-bolt",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Gust",
        "url" => "https://www.dndbeyond.com/spells/2383-gust",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Gust of Wind",
        "url" => "https://www.dndbeyond.com/spells/2619137-gust-of-wind",
        "legacy_url" => "https://www.dndbeyond.com/spells/2134-gust-of-wind",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Hail of Thorns",
        "url" => "https://www.dndbeyond.com/spells/2618975-hail-of-thorns",
        "legacy_url" => "https://www.dndbeyond.com/spells/2316-hail-of-thorns",
        "spell_school" => "conjuration",
        "components" => "V",
        "spell_level" => "1st"
      ],
      [
        "name" => "Hallow",
        "url" => "https://www.dndbeyond.com/spells/2619138-hallow",
        "legacy_url" => "https://www.dndbeyond.com/spells/2135-hallow",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Hallucinatory Terrain",
        "url" => "https://www.dndbeyond.com/spells/2619139-hallucinatory-terrain",
        "legacy_url" => "https://www.dndbeyond.com/spells/2136-hallucinatory-terrain",
        "spell_school" => "illusion",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Harm",
        "url" => "https://www.dndbeyond.com/spells/2618977-harm",
        "legacy_url" => "https://www.dndbeyond.com/spells/2137-harm",
        "spell_school" => "necromancy",
        "components" => "V, S",
        "spell_level" => "6th"
      ],
      [
        "name" => "Haste",
        "url" => "https://www.dndbeyond.com/spells/2619141-haste",
        "legacy_url" => "https://www.dndbeyond.com/spells/2138-haste",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Heal",
        "url" => "https://www.dndbeyond.com/spells/2618979-heal",
        "legacy_url" => "https://www.dndbeyond.com/spells/2139-heal",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "6th"
      ],
      [
        "name" => "Healing Spirit",
        "url" => "https://www.dndbeyond.com/spells/14873-healing-spirit",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Healing Word",
        "url" => "https://www.dndbeyond.com/spells/2619143-healing-word",
        "legacy_url" => "https://www.dndbeyond.com/spells/2140-healing-word",
        "spell_school" => "evocation",
        "components" => "V",
        "spell_level" => "1st"
      ],
      [
        "name" => "Heat Metal",
        "url" => "https://www.dndbeyond.com/spells/2619145-heat-metal",
        "legacy_url" => "https://www.dndbeyond.com/spells/2141-heat-metal",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Hellish Rebuke",
        "url" => "https://www.dndbeyond.com/spells/2619149-hellish-rebuke",
        "legacy_url" => "https://www.dndbeyond.com/spells/2142-hellish-rebuke",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Heroes' Feast",
        "url" => "https://www.dndbeyond.com/spells/2618983-heroes-feast",
        "legacy_url" => "https://www.dndbeyond.com/spells/2143-heroes-feast",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Heroism",
        "url" => "https://www.dndbeyond.com/spells/2619151-heroism",
        "legacy_url" => "https://www.dndbeyond.com/spells/2144-heroism",
        "spell_school" => "enchantment",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Hex",
        "url" => "https://www.dndbeyond.com/spells/2618988-hex",
        "legacy_url" => "https://www.dndbeyond.com/spells/2317-hex",
        "spell_school" => "enchantment",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Hideous Laughter",
        "url" => null,
        "legacy_url" => "https://www.dndbeyond.com/spells/2145-hideous-laughter",
        "spell_school" => "enchantment",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Hold Monster",
        "url" => "https://www.dndbeyond.com/spells/2619152-hold-monster",
        "legacy_url" => "https://www.dndbeyond.com/spells/2146-hold-monster",
        "spell_school" => "enchantment",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Hold Person",
        "url" => "https://www.dndbeyond.com/spells/2619153-hold-person",
        "legacy_url" => "https://www.dndbeyond.com/spells/2147-hold-person",
        "spell_school" => "enchantment",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Holy Aura",
        "url" => "https://www.dndbeyond.com/spells/2619155-holy-aura",
        "legacy_url" => "https://www.dndbeyond.com/spells/2148-holy-aura",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "8th"
      ],
      [
        "name" => "Holy Weapon",
        "url" => "https://www.dndbeyond.com/spells/14874-holy-weapon",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "5th"
      ],
      [
        "name" => "Hunger of Hadar",
        "url" => "https://www.dndbeyond.com/spells/2619162-hunger-of-hadar",
        "legacy_url" => "https://www.dndbeyond.com/spells/2339-hunger-of-hadar",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Hunter's Mark",
        "url" => "https://www.dndbeyond.com/spells/2619166-hunters-mark",
        "legacy_url" => "https://www.dndbeyond.com/spells/2149-hunters-mark",
        "spell_school" => "divination",
        "components" => "V",
        "spell_level" => "1st"
      ],
      [
        "name" => "Hypnotic Pattern",
        "url" => "https://www.dndbeyond.com/spells/2619168-hypnotic-pattern",
        "legacy_url" => "https://www.dndbeyond.com/spells/2150-hypnotic-pattern",
        "spell_school" => "illusion",
        "components" => "S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Ice Knife",
        "url" => "https://www.dndbeyond.com/spells/2619171-ice-knife",
        "legacy_url" => "https://www.dndbeyond.com/spells/2384-ice-knife",
        "spell_school" => "conjuration",
        "components" => "S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Ice Storm",
        "url" => "https://www.dndbeyond.com/spells/2619178-ice-storm",
        "legacy_url" => "https://www.dndbeyond.com/spells/2151-ice-storm",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Identify",
        "url" => "https://www.dndbeyond.com/spells/2619180-identify",
        "legacy_url" => "https://www.dndbeyond.com/spells/2152-identify",
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Illusory Dragon",
        "url" => "https://www.dndbeyond.com/spells/14876-illusory-dragon",
        "legacy_url" => null,
        "spell_school" => "illusion",
        "components" => "S",
        "spell_level" => "8th"
      ],
      [
        "name" => "Illusory Script",
        "url" => "https://www.dndbeyond.com/spells/2619173-illusory-script",
        "legacy_url" => "https://www.dndbeyond.com/spells/2153-illusory-script",
        "spell_school" => "illusion",
        "components" => "S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Immolation",
        "url" => "https://www.dndbeyond.com/spells/2385-immolation",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V",
        "spell_level" => "5th"
      ],
      [
        "name" => "Immovable Object",
        "url" => "https://www.dndbeyond.com/spells/416803-immovable-object",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Imprisonment",
        "url" => "https://www.dndbeyond.com/spells/2619175-imprisonment",
        "legacy_url" => "https://www.dndbeyond.com/spells/2154-imprisonment",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "9th"
      ],
      [
        "name" => "Incendiary Cloud",
        "url" => "https://www.dndbeyond.com/spells/2619177-incendiary-cloud",
        "legacy_url" => "https://www.dndbeyond.com/spells/2155-incendiary-cloud",
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "8th"
      ],
      [
        "name" => "Incite Greed",
        "url" => "https://www.dndbeyond.com/spells/188121-incite-greed",
        "legacy_url" => null,
        "spell_school" => "enchantment",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Infernal Calling",
        "url" => "https://www.dndbeyond.com/spells/14877-infernal-calling",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Infestation",
        "url" => "https://www.dndbeyond.com/spells/14878-infestation",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Inflict Wounds",
        "url" => "https://www.dndbeyond.com/spells/2619181-inflict-wounds",
        "legacy_url" => "https://www.dndbeyond.com/spells/2156-inflict-wounds",
        "spell_school" => "necromancy",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Insect Plague",
        "url" => "https://www.dndbeyond.com/spells/2619183-insect-plague",
        "legacy_url" => "https://www.dndbeyond.com/spells/2157-insect-plague",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Instant Summons",
        "url" => null,
        "legacy_url" => "https://www.dndbeyond.com/spells/2158-instant-summons",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Intellect Fortress",
        "url" => "https://www.dndbeyond.com/spells/718549-intellect-fortress",
        "legacy_url" => null,
        "spell_school" => "abjuration",
        "components" => "V",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Investiture of Flame",
        "url" => "https://www.dndbeyond.com/spells/2386-investiture-of-flame",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "6th"
      ],
      [
        "name" => "Investiture of Ice",
        "url" => "https://www.dndbeyond.com/spells/2387-investiture-of-ice",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "6th"
      ],
      [
        "name" => "Investiture of Stone",
        "url" => "https://www.dndbeyond.com/spells/2388-investiture-of-stone",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "6th"
      ],
      [
        "name" => "Investiture of Wind",
        "url" => "https://www.dndbeyond.com/spells/2389-investiture-of-wind",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "6th"
      ],
      [
        "name" => "Invisibility",
        "url" => "https://www.dndbeyond.com/spells/2619116-invisibility",
        "legacy_url" => "https://www.dndbeyond.com/spells/2159-invisibility",
        "spell_school" => "illusion",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Invulnerability",
        "url" => "https://www.dndbeyond.com/spells/14879-invulnerability",
        "legacy_url" => null,
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "9th"
      ],
      [
        "name" => "Jallarzi's Storm of Radiance",
        "url" => "https://www.dndbeyond.com/spells/2618836-jallarzis-storm-of-radiance",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Jim's Glowing Coin",
        "url" => "https://www.dndbeyond.com/spells/188126-jims-glowing-coin",
        "legacy_url" => null,
        "spell_school" => "enchantment",
        "components" => "S, M, R",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Jim's Magic Missile",
        "url" => "https://www.dndbeyond.com/spells/188129-jims-magic-missile",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Jump",
        "url" => "https://www.dndbeyond.com/spells/2618991-jump",
        "legacy_url" => "https://www.dndbeyond.com/spells/2161-jump",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Kinetic Jaunt",
        "url" => "https://www.dndbeyond.com/spells/1239803-kinetic-jaunt",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Knock",
        "url" => "https://www.dndbeyond.com/spells/2618992-knock",
        "legacy_url" => "https://www.dndbeyond.com/spells/2162-knock",
        "spell_school" => "transmutation",
        "components" => "V",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Legend Lore",
        "url" => "https://www.dndbeyond.com/spells/2619010-legend-lore",
        "legacy_url" => "https://www.dndbeyond.com/spells/2163-legend-lore",
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Leomund's Secret Chest",
        "url" => "https://www.dndbeyond.com/spells/2619012-leomunds-secret-chest",
        "legacy_url" => "https://www.dndbeyond.com/spells/2346-leomunds-secret-chest",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Leomund's Tiny Hut",
        "url" => "https://www.dndbeyond.com/spells/2619013-leomunds-tiny-hut",
        "legacy_url" => "https://www.dndbeyond.com/spells/2340-leomunds-tiny-hut",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Drawmij's Instant Summons",
        "url" => "https://www.dndbeyond.com/spells/2619154-drawmijs-instant-summons",
        "legacy_url" => "https://www.dndbeyond.com/spells/2359-drawmijs-instant-summons",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Dream",
        "url" => "https://www.dndbeyond.com/spells/2619156-dream",
        "legacy_url" => "https://www.dndbeyond.com/spells/2079-dream",
        "spell_school" => "illusion",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Dream of the Blue Veil",
        "url" => "https://www.dndbeyond.com/spells/717915-dream-of-the-blue-veil",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "7th"
      ],
      [
        "name" => "Druid Grove",
        "url" => "https://www.dndbeyond.com/spells/14834-druid-grove",
        "legacy_url" => null,
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Druidcraft",
        "url" => "https://www.dndbeyond.com/spells/2619158-druidcraft",
        "legacy_url" => "https://www.dndbeyond.com/spells/2080-druidcraft",
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Dust Devil",
        "url" => "https://www.dndbeyond.com/spells/2376-dust-devil",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Earth Tremor",
        "url" => "https://www.dndbeyond.com/spells/2378-earth-tremor",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Earthbind",
        "url" => "https://www.dndbeyond.com/spells/2377-earthbind",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Earthquake",
        "url" => "https://www.dndbeyond.com/spells/2619160-earthquake",
        "legacy_url" => "https://www.dndbeyond.com/spells/2081-earthquake",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "8th"
      ],
      [
        "name" => "Eldritch Blast",
        "url" => "https://www.dndbeyond.com/spells/2619161-eldritch-blast",
        "legacy_url" => "https://www.dndbeyond.com/spells/2082-eldritch-blast",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Elemental Bane",
        "url" => "https://www.dndbeyond.com/spells/2379-elemental-bane",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "4th"
      ],
      [
        "name" => "Elemental Weapon",
        "url" => "https://www.dndbeyond.com/spells/2619164-elemental-weapon",
        "legacy_url" => "https://www.dndbeyond.com/spells/2337-elemental-weapon",
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Elementalism",
        "url" => "https://www.dndbeyond.com/spells/2618834-elementalism",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Longstrider",
        "url" => "https://www.dndbeyond.com/spells/2619004-longstrider",
        "legacy_url" => "https://www.dndbeyond.com/spells/2171-longstrider",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Maddening Darkness",
        "url" => "https://www.dndbeyond.com/spells/14881-maddening-darkness",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, M",
        "spell_level" => "8th"
      ],
      [
        "name" => "Maelstrom",
        "url" => "https://www.dndbeyond.com/spells/2390-maelstrom",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Mage Armor",
        "url" => "https://www.dndbeyond.com/spells/2619006-mage-armor",
        "legacy_url" => "https://www.dndbeyond.com/spells/2172-mage-armor",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Mage Hand",
        "url" => "https://www.dndbeyond.com/spells/2619008-mage-hand",
        "legacy_url" => "https://www.dndbeyond.com/spells/2173-mage-hand",
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Magic Circle",
        "url" => "https://www.dndbeyond.com/spells/2619018-magic-circle",
        "legacy_url" => "https://www.dndbeyond.com/spells/2174-magic-circle",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Magic Jar",
        "url" => "https://www.dndbeyond.com/spells/2619021-magic-jar",
        "legacy_url" => "https://www.dndbeyond.com/spells/2175-magic-jar",
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Magic Missile",
        "url" => "https://www.dndbeyond.com/spells/2619022-magic-missile",
        "legacy_url" => "https://www.dndbeyond.com/spells/2176-magic-missile",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Magic Mouth",
        "url" => "https://www.dndbeyond.com/spells/2619023-magic-mouth",
        "legacy_url" => "https://www.dndbeyond.com/spells/2177-magic-mouth",
        "spell_school" => "illusion",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Magic Stone",
        "url" => "https://www.dndbeyond.com/spells/2391-magic-stone",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Magic Weapon",
        "url" => "https://www.dndbeyond.com/spells/2619024-magic-weapon",
        "legacy_url" => "https://www.dndbeyond.com/spells/2178-magic-weapon",
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Magnificent Mansion",
        "url" => null,
        "legacy_url" => "https://www.dndbeyond.com/spells/2179-magnificent-mansion",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "7th"
      ],
      [
        "name" => "Magnify Gravity",
        "url" => "https://www.dndbeyond.com/spells/416804-magnify-gravity",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Lesser Restoration",
        "url" => "https://www.dndbeyond.com/spells/2619016-lesser-restoration",
        "legacy_url" => "https://www.dndbeyond.com/spells/2164-lesser-restoration",
        "spell_school" => "abjuration",
        "components" => "V, S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Levitate",
        "url" => "https://www.dndbeyond.com/spells/2618994-levitate",
        "legacy_url" => "https://www.dndbeyond.com/spells/2165-levitate",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Life Transference",
        "url" => "https://www.dndbeyond.com/spells/14880-life-transference",
        "legacy_url" => null,
        "spell_school" => "necromancy",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Light",
        "url" => "https://www.dndbeyond.com/spells/2618996-light",
        "legacy_url" => "https://www.dndbeyond.com/spells/2166-light",
        "spell_school" => "evocation",
        "components" => "V, M",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Lightning Arrow",
        "url" => "https://www.dndbeyond.com/spells/2618997-lightning-arrow",
        "legacy_url" => "https://www.dndbeyond.com/spells/2341-lightning-arrow",
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Lightning Bolt",
        "url" => "https://www.dndbeyond.com/spells/2618999-lightning-bolt",
        "legacy_url" => "https://www.dndbeyond.com/spells/2167-lightning-bolt",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Lightning Lure",
        "url" => "https://www.dndbeyond.com/spells/2412-lightning-lure",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Locate Animals or Plants",
        "url" => "https://www.dndbeyond.com/spells/2619000-locate-animals-or-plants",
        "legacy_url" => "https://www.dndbeyond.com/spells/2168-locate-animals-or-plants",
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Locate Creature",
        "url" => "https://www.dndbeyond.com/spells/2619001-locate-creature",
        "legacy_url" => "https://www.dndbeyond.com/spells/2169-locate-creature",
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Locate Object",
        "url" => "https://www.dndbeyond.com/spells/2619002-locate-object",
        "legacy_url" => "https://www.dndbeyond.com/spells/2170-locate-object",
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Mislead",
        "url" => "https://www.dndbeyond.com/spells/2619131-mislead",
        "legacy_url" => "https://www.dndbeyond.com/spells/2194-mislead",
        "spell_school" => "illusion",
        "components" => "S",
        "spell_level" => "5th"
      ],
      [
        "name" => "Misty Step",
        "url" => "https://www.dndbeyond.com/spells/2619133-misty-step",
        "legacy_url" => "https://www.dndbeyond.com/spells/2195-misty-step",
        "spell_school" => "conjuration",
        "components" => "V",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Modify Memory",
        "url" => "https://www.dndbeyond.com/spells/2619109-modify-memory",
        "legacy_url" => "https://www.dndbeyond.com/spells/2196-modify-memory",
        "spell_school" => "enchantment",
        "components" => "V, S",
        "spell_level" => "5th"
      ],
      [
        "name" => "Mold Earth",
        "url" => "https://www.dndbeyond.com/spells/2394-mold-earth",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Moonbeam",
        "url" => "https://www.dndbeyond.com/spells/2619134-moonbeam",
        "legacy_url" => "https://www.dndbeyond.com/spells/2197-moonbeam",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Mordenkainen's Faithful Hound",
        "url" => "https://www.dndbeyond.com/spells/2619110-mordenkainens-faithful-hound",
        "legacy_url" => "https://www.dndbeyond.com/spells/2347-mordenkainens-faithful-hound",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Mordenkainen's Magnificent Mansion",
        "url" => "https://www.dndbeyond.com/spells/2619112-mordenkainens-magnificent-mansion",
        "legacy_url" => "https://www.dndbeyond.com/spells/2362-mordenkainens-magnificent-mansion",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "7th"
      ],
      [
        "name" => "Mordenkainen's Private Sanctum",
        "url" => "https://www.dndbeyond.com/spells/2619114-mordenkainens-private-sanctum",
        "legacy_url" => "https://www.dndbeyond.com/spells/2348-mordenkainens-private-sanctum",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Mordenkainen's Sword",
        "url" => "https://www.dndbeyond.com/spells/2619118-mordenkainens-sword",
        "legacy_url" => "https://www.dndbeyond.com/spells/2004-mordenkainens-sword",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "7th"
      ],
      [
        "name" => "Motivational Speech",
        "url" => "https://www.dndbeyond.com/spells/188142-motivational-speech",
        "legacy_url" => null,
        "spell_school" => "enchantment",
        "components" => "V",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Move Earth",
        "url" => "https://www.dndbeyond.com/spells/2619120-move-earth",
        "legacy_url" => "https://www.dndbeyond.com/spells/2198-move-earth",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Nathair's Mischief",
        "url" => "https://www.dndbeyond.com/spells/1183865-nathairs-mischief",
        "legacy_url" => null,
        "spell_school" => "illusion",
        "components" => "S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Mending",
        "url" => "https://www.dndbeyond.com/spells/2619033-mending",
        "legacy_url" => "https://www.dndbeyond.com/spells/2187-mending",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Mental Prison",
        "url" => "https://www.dndbeyond.com/spells/14883-mental-prison",
        "legacy_url" => null,
        "spell_school" => "illusion",
        "components" => "S",
        "spell_level" => "6th"
      ],
      [
        "name" => "Message",
        "url" => "https://www.dndbeyond.com/spells/2619034-message",
        "legacy_url" => "https://www.dndbeyond.com/spells/2188-message",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Meteor Swarm",
        "url" => "https://www.dndbeyond.com/spells/2619035-meteor-swarm",
        "legacy_url" => "https://www.dndbeyond.com/spells/2189-meteor-swarm",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "9th"
      ],
      [
        "name" => "Mighty Fortress",
        "url" => "https://www.dndbeyond.com/spells/14474-mighty-fortress",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "8th"
      ],
      [
        "name" => "Mind Blank",
        "url" => "https://www.dndbeyond.com/spells/2619036-mind-blank",
        "legacy_url" => "https://www.dndbeyond.com/spells/2190-mind-blank",
        "spell_school" => "abjuration",
        "components" => "V, S",
        "spell_level" => "8th"
      ],
      [
        "name" => "Mind Sliver",
        "url" => "https://www.dndbeyond.com/spells/2619037-mind-sliver",
        "legacy_url" => "https://www.dndbeyond.com/spells/718568-mind-sliver",
        "spell_school" => "enchantment",
        "components" => "V",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Mind Spike",
        "url" => "https://www.dndbeyond.com/spells/2619038-mind-spike",
        "legacy_url" => "https://www.dndbeyond.com/spells/14482-mind-spike",
        "spell_school" => "divination",
        "components" => "S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Minor Illusion",
        "url" => "https://www.dndbeyond.com/spells/2619039-minor-illusion",
        "legacy_url" => "https://www.dndbeyond.com/spells/2191-minor-illusion",
        "spell_school" => "illusion",
        "components" => "S, M",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Mirage Arcane",
        "url" => "https://www.dndbeyond.com/spells/2619040-mirage-arcane",
        "legacy_url" => "https://www.dndbeyond.com/spells/2192-mirage-arcane",
        "spell_school" => "illusion",
        "components" => "V, S",
        "spell_level" => "7th"
      ],
      [
        "name" => "Mirror Image",
        "url" => "https://www.dndbeyond.com/spells/2619060-mirror-image",
        "legacy_url" => "https://www.dndbeyond.com/spells/2193-mirror-image",
        "spell_school" => "illusion",
        "components" => "V, S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Eyebite",
        "url" => "https://www.dndbeyond.com/spells/2619191-eyebite",
        "legacy_url" => "https://www.dndbeyond.com/spells/2089-eyebite",
        "spell_school" => "necromancy",
        "components" => "V, S",
        "spell_level" => "6th"
      ],
      [
        "name" => "Fabricate",
        "url" => "https://www.dndbeyond.com/spells/2618848-fabricate",
        "legacy_url" => "https://www.dndbeyond.com/spells/2090-fabricate",
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "4th"
      ],
      [
        "name" => "Faerie Fire",
        "url" => "https://www.dndbeyond.com/spells/2618858-faerie-fire",
        "legacy_url" => "https://www.dndbeyond.com/spells/2091-faerie-fire",
        "spell_school" => "evocation",
        "components" => "V",
        "spell_level" => "1st"
      ],
      [
        "name" => "Faithful Hound",
        "url" => null,
        "legacy_url" => "https://www.dndbeyond.com/spells/2092-faithful-hound",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "False Life",
        "url" => "https://www.dndbeyond.com/spells/2618866-false-life",
        "legacy_url" => "https://www.dndbeyond.com/spells/2093-false-life",
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Far Step",
        "url" => "https://www.dndbeyond.com/spells/14870-far-step",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V",
        "spell_level" => "5th"
      ],
      [
        "name" => "Fast Friends",
        "url" => "https://www.dndbeyond.com/spells/188104-fast-friends",
        "legacy_url" => null,
        "spell_school" => "enchantment",
        "components" => "V",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Fear",
        "url" => "https://www.dndbeyond.com/spells/2618872-fear",
        "legacy_url" => "https://www.dndbeyond.com/spells/2094-fear",
        "spell_school" => "illusion",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Feather Fall",
        "url" => "https://www.dndbeyond.com/spells/2618874-feather-fall",
        "legacy_url" => "https://www.dndbeyond.com/spells/2095-feather-fall",
        "spell_school" => "transmutation",
        "components" => "V, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Feeblemind",
        "url" => null,
        "legacy_url" => "https://www.dndbeyond.com/spells/2096-feeblemind",
        "spell_school" => "enchantment",
        "components" => "V, S, M",
        "spell_level" => "8th"
      ],
      [
        "name" => "Feign Death",
        "url" => "https://www.dndbeyond.com/spells/2618873-feign-death",
        "legacy_url" => "https://www.dndbeyond.com/spells/2338-feign-death",
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Find Familiar",
        "url" => "https://www.dndbeyond.com/spells/2618877-find-familiar",
        "legacy_url" => "https://www.dndbeyond.com/spells/2097-find-familiar",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Negative Energy Flood",
        "url" => "https://www.dndbeyond.com/spells/14519-negative-energy-flood",
        "legacy_url" => null,
        "spell_school" => "necromancy",
        "components" => "V, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Neutralizing Field",
        "url" => "https://www.dndbeyond.com/spells/2221553-neutralizing-field",
        "legacy_url" => null,
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Nondetection",
        "url" => "https://www.dndbeyond.com/spells/2619122-nondetection",
        "legacy_url" => "https://www.dndbeyond.com/spells/2199-nondetection",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Nystul's Magic Aura",
        "url" => "https://www.dndbeyond.com/spells/2619124-nystuls-magic-aura",
        "legacy_url" => "https://www.dndbeyond.com/spells/2331-nystuls-magic-aura",
        "spell_school" => "illusion",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Octarine Spray",
        "url" => "https://www.dndbeyond.com/spells/2221554-octarine-spray",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "7th"
      ],
      [
        "name" => "Otiluke's Freezing Sphere",
        "url" => "https://www.dndbeyond.com/spells/2619126-otilukes-freezing-sphere",
        "legacy_url" => "https://www.dndbeyond.com/spells/2360-otilukes-freezing-sphere",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Otiluke's Resilient Sphere",
        "url" => "https://www.dndbeyond.com/spells/2619128-otilukes-resilient-sphere",
        "legacy_url" => "https://www.dndbeyond.com/spells/2349-otilukes-resilient-sphere",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Otto's Irresistible Dance",
        "url" => "https://www.dndbeyond.com/spells/2619130-ottos-irresistible-dance",
        "legacy_url" => "https://www.dndbeyond.com/spells/2160-ottos-irresistible-dance",
        "spell_school" => "enchantment",
        "components" => "V",
        "spell_level" => "6th"
      ],
      [
        "name" => "Pass without Trace",
        "url" => "https://www.dndbeyond.com/spells/2618849-pass-without-trace",
        "legacy_url" => "https://www.dndbeyond.com/spells/2201-pass-without-trace",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Passwall",
        "url" => "https://www.dndbeyond.com/spells/2618852-passwall",
        "legacy_url" => "https://www.dndbeyond.com/spells/2200-passwall",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Phantasmal Force",
        "url" => "https://www.dndbeyond.com/spells/2618854-phantasmal-force",
        "legacy_url" => "https://www.dndbeyond.com/spells/2332-phantasmal-force",
        "spell_school" => "illusion",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Phantasmal Killer",
        "url" => "https://www.dndbeyond.com/spells/2618857-phantasmal-killer",
        "legacy_url" => "https://www.dndbeyond.com/spells/2202-phantasmal-killer",
        "spell_school" => "illusion",
        "components" => "V, S",
        "spell_level" => "4th"
      ],
      [
        "name" => "Major Image",
        "url" => "https://www.dndbeyond.com/spells/2619025-major-image",
        "legacy_url" => "https://www.dndbeyond.com/spells/2180-major-image",
        "spell_school" => "illusion",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Mass Cure Wounds",
        "url" => "https://www.dndbeyond.com/spells/2619026-mass-cure-wounds",
        "legacy_url" => "https://www.dndbeyond.com/spells/2181-mass-cure-wounds",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "5th"
      ],
      [
        "name" => "Mass Heal",
        "url" => "https://www.dndbeyond.com/spells/2619027-mass-heal",
        "legacy_url" => "https://www.dndbeyond.com/spells/2182-mass-heal",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "9th"
      ],
      [
        "name" => "Mass Healing Word",
        "url" => "https://www.dndbeyond.com/spells/2619028-mass-healing-word",
        "legacy_url" => "https://www.dndbeyond.com/spells/2183-mass-healing-word",
        "spell_school" => "evocation",
        "components" => "V",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Mass Polymorph",
        "url" => "https://www.dndbeyond.com/spells/14882-mass-polymorph",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "9th"
      ],
      [
        "name" => "Mass Suggestion",
        "url" => "https://www.dndbeyond.com/spells/2619029-mass-suggestion",
        "legacy_url" => "https://www.dndbeyond.com/spells/2184-mass-suggestion",
        "spell_school" => "enchantment",
        "components" => "V, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Maximilian's Earthen Grasp",
        "url" => "https://www.dndbeyond.com/spells/2392-maximilians-earthen-grasp",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Maze",
        "url" => "https://www.dndbeyond.com/spells/2619030-maze",
        "legacy_url" => "https://www.dndbeyond.com/spells/2185-maze",
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "8th"
      ],
      [
        "name" => "Meld into Stone",
        "url" => "https://www.dndbeyond.com/spells/2619031-meld-into-stone",
        "legacy_url" => "https://www.dndbeyond.com/spells/2186-meld-into-stone",
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Melf's Acid Arrow",
        "url" => "https://www.dndbeyond.com/spells/2619032-melfs-acid-arrow",
        "legacy_url" => "https://www.dndbeyond.com/spells/2330-melfs-acid-arrow",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Melf's Minute Meteors",
        "url" => "https://www.dndbeyond.com/spells/2393-melfs-minute-meteors",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Phantom Steed",
        "url" => "https://www.dndbeyond.com/spells/2618859-phantom-steed",
        "legacy_url" => "https://www.dndbeyond.com/spells/2203-phantom-steed",
        "spell_school" => "illusion",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Planar Ally",
        "url" => "https://www.dndbeyond.com/spells/2618861-planar-ally",
        "legacy_url" => "https://www.dndbeyond.com/spells/2204-planar-ally",
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "6th"
      ],
      [
        "name" => "Planar Binding",
        "url" => "https://www.dndbeyond.com/spells/2618864-planar-binding",
        "legacy_url" => "https://www.dndbeyond.com/spells/2205-planar-binding",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Plane Shift",
        "url" => "https://www.dndbeyond.com/spells/2618867-plane-shift",
        "legacy_url" => "https://www.dndbeyond.com/spells/2206-plane-shift",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "7th"
      ],
      [
        "name" => "Plant Growth",
        "url" => "https://www.dndbeyond.com/spells/2618869-plant-growth",
        "legacy_url" => "https://www.dndbeyond.com/spells/2207-plant-growth",
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Poison Spray",
        "url" => "https://www.dndbeyond.com/spells/2618875-poison-spray",
        "legacy_url" => "https://www.dndbeyond.com/spells/2208-poison-spray",
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Polymorph",
        "url" => "https://www.dndbeyond.com/spells/2618876-polymorph",
        "legacy_url" => "https://www.dndbeyond.com/spells/2209-polymorph",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Power Word Fortify",
        "url" => "https://www.dndbeyond.com/spells/2618837-power-word-fortify",
        "legacy_url" => null,
        "spell_school" => "enchantment",
        "components" => "V",
        "spell_level" => "7th"
      ],
      [
        "name" => "Power Word Heal",
        "url" => "https://www.dndbeyond.com/spells/2618880-power-word-heal",
        "legacy_url" => "https://www.dndbeyond.com/spells/2366-power-word-heal",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "9th"
      ],
      [
        "name" => "Power Word Kill",
        "url" => "https://www.dndbeyond.com/spells/2618886-power-word-kill",
        "legacy_url" => "https://www.dndbeyond.com/spells/2210-power-word-kill",
        "spell_school" => "enchantment",
        "components" => "V",
        "spell_level" => "9th"
      ],
      [
        "name" => "Power Word Pain",
        "url" => "https://www.dndbeyond.com/spells/14520-power-word-pain",
        "legacy_url" => null,
        "spell_school" => "enchantment",
        "components" => "V",
        "spell_level" => "7th"
      ],
      [
        "name" => "Power Word Stun",
        "url" => "https://www.dndbeyond.com/spells/2618889-power-word-stun",
        "legacy_url" => "https://www.dndbeyond.com/spells/2211-power-word-stun",
        "spell_school" => "enchantment",
        "components" => "V",
        "spell_level" => "8th"
      ],
      [
        "name" => "Prayer of Healing",
        "url" => "https://www.dndbeyond.com/spells/2618892-prayer-of-healing",
        "legacy_url" => "https://www.dndbeyond.com/spells/2212-prayer-of-healing",
        "spell_school" => "evocation",
        "components" => "V",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Prestidigitation",
        "url" => "https://www.dndbeyond.com/spells/2618893-prestidigitation",
        "legacy_url" => "https://www.dndbeyond.com/spells/2213-prestidigitation",
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Primal Savagery",
        "url" => "https://www.dndbeyond.com/spells/14558-primal-savagery",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Primordial Ward",
        "url" => "https://www.dndbeyond.com/spells/2395-primordial-ward",
        "legacy_url" => null,
        "spell_school" => "abjuration",
        "components" => "V, S",
        "spell_level" => "6th"
      ],
      [
        "name" => "Prismatic Spray",
        "url" => "https://www.dndbeyond.com/spells/2618895-prismatic-spray",
        "legacy_url" => "https://www.dndbeyond.com/spells/2214-prismatic-spray",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "7th"
      ],
      [
        "name" => "Prismatic Wall",
        "url" => "https://www.dndbeyond.com/spells/2618898-prismatic-wall",
        "legacy_url" => "https://www.dndbeyond.com/spells/2215-prismatic-wall",
        "spell_school" => "abjuration",
        "components" => "V, S",
        "spell_level" => "9th"
      ],
      [
        "name" => "Private Sanctum",
        "url" => null,
        "legacy_url" => "https://www.dndbeyond.com/spells/2216-private-sanctum",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Produce Flame",
        "url" => "https://www.dndbeyond.com/spells/2618901-produce-flame",
        "legacy_url" => "https://www.dndbeyond.com/spells/2217-produce-flame",
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Programmed Illusion",
        "url" => "https://www.dndbeyond.com/spells/2618902-programmed-illusion",
        "legacy_url" => "https://www.dndbeyond.com/spells/2218-programmed-illusion",
        "spell_school" => "illusion",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Project Image",
        "url" => "https://www.dndbeyond.com/spells/2618903-project-image",
        "legacy_url" => "https://www.dndbeyond.com/spells/2219-project-image",
        "spell_school" => "illusion",
        "components" => "V, S, M",
        "spell_level" => "7th"
      ],
      [
        "name" => "Protection from Energy",
        "url" => "https://www.dndbeyond.com/spells/2618908-protection-from-energy",
        "legacy_url" => "https://www.dndbeyond.com/spells/2220-protection-from-energy",
        "spell_school" => "abjuration",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Protection from Evil and Good",
        "url" => "https://www.dndbeyond.com/spells/2618912-protection-from-evil-and-good",
        "legacy_url" => "https://www.dndbeyond.com/spells/2221-protection-from-evil-and-good",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Protection from Poison",
        "url" => "https://www.dndbeyond.com/spells/2618915-protection-from-poison",
        "legacy_url" => "https://www.dndbeyond.com/spells/2222-protection-from-poison",
        "spell_school" => "abjuration",
        "components" => "V, S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Psychic Scream",
        "url" => "https://www.dndbeyond.com/spells/14592-psychic-scream",
        "legacy_url" => null,
        "spell_school" => "enchantment",
        "components" => "S",
        "spell_level" => "9th"
      ],
      [
        "name" => "Pulse Wave",
        "url" => "https://www.dndbeyond.com/spells/416805-pulse-wave",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Purge Contamination",
        "url" => "https://www.dndbeyond.com/spells/2221555-purge-contamination",
        "legacy_url" => null,
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Purify Food and Drink",
        "url" => "https://www.dndbeyond.com/spells/2618917-purify-food-and-drink",
        "legacy_url" => "https://www.dndbeyond.com/spells/2223-purify-food-and-drink",
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Pyrotechnics",
        "url" => "https://www.dndbeyond.com/spells/2396-pyrotechnics",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Raise Dead",
        "url" => "https://www.dndbeyond.com/spells/2618922-raise-dead",
        "legacy_url" => "https://www.dndbeyond.com/spells/2224-raise-dead",
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Rary's Telepathic Bond",
        "url" => "https://www.dndbeyond.com/spells/2618925-rarys-telepathic-bond",
        "legacy_url" => "https://www.dndbeyond.com/spells/2356-rarys-telepathic-bond",
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Raulothim's Psychic Lance",
        "url" => "https://www.dndbeyond.com/spells/1183866-raulothims-psychic-lance",
        "legacy_url" => null,
        "spell_school" => "enchantment",
        "components" => "V",
        "spell_level" => "4th"
      ],
      [
        "name" => "Ravenous Void",
        "url" => "https://www.dndbeyond.com/spells/416806-ravenous-void",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "9th"
      ],
      [
        "name" => "Ray of Contamination",
        "url" => "https://www.dndbeyond.com/spells/2221556-ray-of-contamination",
        "legacy_url" => null,
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Ray of Enfeeblement",
        "url" => "https://www.dndbeyond.com/spells/2618926-ray-of-enfeeblement",
        "legacy_url" => "https://www.dndbeyond.com/spells/2225-ray-of-enfeeblement",
        "spell_school" => "necromancy",
        "components" => "V, S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Ray of Frost",
        "url" => "https://www.dndbeyond.com/spells/2618930-ray-of-frost",
        "legacy_url" => "https://www.dndbeyond.com/spells/2226-ray-of-frost",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Ray of Sickness",
        "url" => "https://www.dndbeyond.com/spells/2618935-ray-of-sickness",
        "legacy_url" => "https://www.dndbeyond.com/spells/2318-ray-of-sickness",
        "spell_school" => "necromancy",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Reality Break",
        "url" => "https://www.dndbeyond.com/spells/416807-reality-break",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "8th"
      ],
      [
        "name" => "Regenerate",
        "url" => "https://www.dndbeyond.com/spells/2618937-regenerate",
        "legacy_url" => "https://www.dndbeyond.com/spells/2227-regenerate",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "7th"
      ],
      [
        "name" => "Reincarnate",
        "url" => "https://www.dndbeyond.com/spells/2618941-reincarnate",
        "legacy_url" => "https://www.dndbeyond.com/spells/2228-reincarnate",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Remove Curse",
        "url" => "https://www.dndbeyond.com/spells/2618943-remove-curse",
        "legacy_url" => "https://www.dndbeyond.com/spells/2229-remove-curse",
        "spell_school" => "abjuration",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Resilient Sphere",
        "url" => null,
        "legacy_url" => "https://www.dndbeyond.com/spells/2230-resilient-sphere",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Resistance",
        "url" => "https://www.dndbeyond.com/spells/2618947-resistance",
        "legacy_url" => "https://www.dndbeyond.com/spells/2231-resistance",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Resurrection",
        "url" => "https://www.dndbeyond.com/spells/2618953-resurrection",
        "legacy_url" => "https://www.dndbeyond.com/spells/2232-resurrection",
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "7th"
      ],
      [
        "name" => "Reverse Gravity",
        "url" => "https://www.dndbeyond.com/spells/2618954-reverse-gravity",
        "legacy_url" => "https://www.dndbeyond.com/spells/2233-reverse-gravity",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "7th"
      ],
      [
        "name" => "Revivify",
        "url" => "https://www.dndbeyond.com/spells/2618956-revivify",
        "legacy_url" => "https://www.dndbeyond.com/spells/2234-revivify",
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Ride the Rifts",
        "url" => "https://www.dndbeyond.com/spells/2221557-ride-the-rifts",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Rime's Binding Ice",
        "url" => "https://www.dndbeyond.com/spells/1183867-rimes-binding-ice",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Rope Trick",
        "url" => "https://www.dndbeyond.com/spells/2618962-rope-trick",
        "legacy_url" => "https://www.dndbeyond.com/spells/2235-rope-trick",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Sacrament of the Falling Fire",
        "url" => "https://www.dndbeyond.com/spells/2221558-sacrament-of-the-falling-fire",
        "legacy_url" => null,
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "9th"
      ],
      [
        "name" => "Sacred Flame",
        "url" => "https://www.dndbeyond.com/spells/2618967-sacred-flame",
        "legacy_url" => "https://www.dndbeyond.com/spells/2236-sacred-flame",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Sanctuary",
        "url" => "https://www.dndbeyond.com/spells/2619003-sanctuary",
        "legacy_url" => "https://www.dndbeyond.com/spells/2237-sanctuary",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Sapping Sting",
        "url" => "https://www.dndbeyond.com/spells/416808-sapping-sting",
        "legacy_url" => null,
        "spell_school" => "necromancy",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Scatter",
        "url" => "https://www.dndbeyond.com/spells/14593-scatter",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V",
        "spell_level" => "6th"
      ],
      [
        "name" => "Scorching Ray",
        "url" => "https://www.dndbeyond.com/spells/2619005-scorching-ray",
        "legacy_url" => "https://www.dndbeyond.com/spells/2238-scorching-ray",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Scrying",
        "url" => "https://www.dndbeyond.com/spells/2619007-scrying",
        "legacy_url" => "https://www.dndbeyond.com/spells/2239-scrying",
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Searing Smite",
        "url" => "https://www.dndbeyond.com/spells/2619009-searing-smite",
        "legacy_url" => "https://www.dndbeyond.com/spells/2319-searing-smite",
        "spell_school" => "evocation",
        "components" => "V",
        "spell_level" => "1st"
      ],
      [
        "name" => "Secret Chest",
        "url" => null,
        "legacy_url" => "https://www.dndbeyond.com/spells/2240-secret-chest",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "See Invisibility",
        "url" => "https://www.dndbeyond.com/spells/2619011-see-invisibility",
        "legacy_url" => "https://www.dndbeyond.com/spells/2242-see-invisibility",
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Seeming",
        "url" => "https://www.dndbeyond.com/spells/2619014-seeming",
        "legacy_url" => "https://www.dndbeyond.com/spells/2241-seeming",
        "spell_school" => "illusion",
        "components" => "V, S",
        "spell_level" => "5th"
      ],
      [
        "name" => "Sending",
        "url" => "https://www.dndbeyond.com/spells/2619015-sending",
        "legacy_url" => "https://www.dndbeyond.com/spells/2243-sending",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Sequester",
        "url" => "https://www.dndbeyond.com/spells/2618980-sequester",
        "legacy_url" => "https://www.dndbeyond.com/spells/2244-sequester",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "7th"
      ],
      [
        "name" => "Shadow Blade",
        "url" => "https://www.dndbeyond.com/spells/14595-shadow-blade",
        "legacy_url" => null,
        "spell_school" => "illusion",
        "components" => "V, S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Shadow of Moil",
        "url" => "https://www.dndbeyond.com/spells/14596-shadow-of-moil",
        "legacy_url" => null,
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Shape Water",
        "url" => "https://www.dndbeyond.com/spells/2397-shape-water",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Shapechange",
        "url" => "https://www.dndbeyond.com/spells/2618982-shapechange",
        "legacy_url" => "https://www.dndbeyond.com/spells/2245-shapechange",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "9th"
      ],
      [
        "name" => "Shatter",
        "url" => "https://www.dndbeyond.com/spells/2619017-shatter",
        "legacy_url" => "https://www.dndbeyond.com/spells/2246-shatter",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Shield",
        "url" => "https://www.dndbeyond.com/spells/2619019-shield",
        "legacy_url" => "https://www.dndbeyond.com/spells/2247-shield",
        "spell_school" => "abjuration",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Shield of Faith",
        "url" => "https://www.dndbeyond.com/spells/2619020-shield-of-faith",
        "legacy_url" => "https://www.dndbeyond.com/spells/2248-shield-of-faith",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Shillelagh",
        "url" => "https://www.dndbeyond.com/spells/2618984-shillelagh",
        "legacy_url" => "https://www.dndbeyond.com/spells/2249-shillelagh",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Demiplane",
        "url" => "https://www.dndbeyond.com/spells/2619088-demiplane",
        "legacy_url" => "https://www.dndbeyond.com/spells/2063-demiplane",
        "spell_school" => "conjuration",
        "components" => "S",
        "spell_level" => "8th"
      ],
      [
        "name" => "Destructive Wave",
        "url" => "https://www.dndbeyond.com/spells/2619089-destructive-wave",
        "legacy_url" => "https://www.dndbeyond.com/spells/2355-destructive-wave",
        "spell_school" => "evocation",
        "components" => "V",
        "spell_level" => "5th"
      ],
      [
        "name" => "Detect Evil and Good",
        "url" => "https://www.dndbeyond.com/spells/2619090-detect-evil-and-good",
        "legacy_url" => "https://www.dndbeyond.com/spells/2064-detect-evil-and-good",
        "spell_school" => "divination",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Detect Magic",
        "url" => "https://www.dndbeyond.com/spells/2619097-detect-magic",
        "legacy_url" => "https://www.dndbeyond.com/spells/2065-detect-magic",
        "spell_school" => "divination",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Detect Poison and Disease",
        "url" => "https://www.dndbeyond.com/spells/2619093-detect-poison-and-disease",
        "legacy_url" => "https://www.dndbeyond.com/spells/2066-detect-poison-and-disease",
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Detect Thoughts",
        "url" => "https://www.dndbeyond.com/spells/2619099-detect-thoughts",
        "legacy_url" => "https://www.dndbeyond.com/spells/2067-detect-thoughts",
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Dimension Door",
        "url" => "https://www.dndbeyond.com/spells/2619100-dimension-door",
        "legacy_url" => "https://www.dndbeyond.com/spells/2068-dimension-door",
        "spell_school" => "conjuration",
        "components" => "V",
        "spell_level" => "4th"
      ],
      [
        "name" => "Disguise Self",
        "url" => "https://www.dndbeyond.com/spells/2619102-disguise-self",
        "legacy_url" => "https://www.dndbeyond.com/spells/2069-disguise-self",
        "spell_school" => "illusion",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Disintegrate",
        "url" => "https://www.dndbeyond.com/spells/2619094-disintegrate",
        "legacy_url" => "https://www.dndbeyond.com/spells/2070-disintegrate",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Dispel Evil and Good",
        "url" => "https://www.dndbeyond.com/spells/2619096-dispel-evil-and-good",
        "legacy_url" => "https://www.dndbeyond.com/spells/2071-dispel-evil-and-good",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Shining Smite",
        "url" => "https://www.dndbeyond.com/spells/2618838-shining-smite",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Shocking Grasp",
        "url" => "https://www.dndbeyond.com/spells/2618986-shocking-grasp",
        "legacy_url" => "https://www.dndbeyond.com/spells/2250-shocking-grasp",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Sickening Radiance",
        "url" => "https://www.dndbeyond.com/spells/14597-sickening-radiance",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "4th"
      ],
      [
        "name" => "Silence",
        "url" => "https://www.dndbeyond.com/spells/2619061-silence",
        "legacy_url" => "https://www.dndbeyond.com/spells/2251-silence",
        "spell_school" => "illusion",
        "components" => "V, S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Silent Image",
        "url" => "https://www.dndbeyond.com/spells/2619062-silent-image",
        "legacy_url" => "https://www.dndbeyond.com/spells/2252-silent-image",
        "spell_school" => "illusion",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Silvery Barbs",
        "url" => "https://www.dndbeyond.com/spells/1239804-silvery-barbs",
        "legacy_url" => null,
        "spell_school" => "enchantment",
        "components" => "V",
        "spell_level" => "1st"
      ],
      [
        "name" => "Simulacrum",
        "url" => "https://www.dndbeyond.com/spells/2618995-simulacrum",
        "legacy_url" => "https://www.dndbeyond.com/spells/2253-simulacrum",
        "spell_school" => "illusion",
        "components" => "V, S, M",
        "spell_level" => "7th"
      ],
      [
        "name" => "Siphon Contamination",
        "url" => "https://www.dndbeyond.com/spells/2221559-siphon-contamination",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Skill Empowerment",
        "url" => "https://www.dndbeyond.com/spells/14599-skill-empowerment",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "5th"
      ],
      [
        "name" => "Skywrite",
        "url" => "https://www.dndbeyond.com/spells/2398-skywrite",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Sleep",
        "url" => "https://www.dndbeyond.com/spells/2619064-sleep",
        "legacy_url" => "https://www.dndbeyond.com/spells/2254-sleep",
        "spell_school" => "enchantment",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Sleet Storm",
        "url" => "https://www.dndbeyond.com/spells/2618998-sleet-storm",
        "legacy_url" => "https://www.dndbeyond.com/spells/2255-sleet-storm",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Slow",
        "url" => "https://www.dndbeyond.com/spells/2619066-slow",
        "legacy_url" => "https://www.dndbeyond.com/spells/2256-slow",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Snare",
        "url" => "https://www.dndbeyond.com/spells/14600-snare",
        "legacy_url" => null,
        "spell_school" => "abjuration",
        "components" => "S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Snilloc's Snowball Swarm",
        "url" => "https://www.dndbeyond.com/spells/2399-snillocs-snowball-swarm",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Sorcerous Burst",
        "url" => "https://www.dndbeyond.com/spells/2618839-sorcerous-burst",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Soul Cage",
        "url" => "https://www.dndbeyond.com/spells/14601-soul-cage",
        "legacy_url" => null,
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Spare the Dying",
        "url" => "https://www.dndbeyond.com/spells/2619067-spare-the-dying",
        "legacy_url" => "https://www.dndbeyond.com/spells/2257-spare-the-dying",
        "spell_school" => "necromancy",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Speak with Animals",
        "url" => "https://www.dndbeyond.com/spells/2619059-speak-with-animals",
        "legacy_url" => "https://www.dndbeyond.com/spells/2258-speak-with-animals",
        "spell_school" => "divination",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Speak with Dead",
        "url" => "https://www.dndbeyond.com/spells/2619068-speak-with-dead",
        "legacy_url" => "https://www.dndbeyond.com/spells/2259-speak-with-dead",
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Speak with Plants",
        "url" => "https://www.dndbeyond.com/spells/2619069-speak-with-plants",
        "legacy_url" => "https://www.dndbeyond.com/spells/2260-speak-with-plants",
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Spider Climb",
        "url" => "https://www.dndbeyond.com/spells/2619071-spider-climb",
        "legacy_url" => "https://www.dndbeyond.com/spells/2261-spider-climb",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Spike Growth",
        "url" => "https://www.dndbeyond.com/spells/2619075-spike-growth",
        "legacy_url" => "https://www.dndbeyond.com/spells/2262-spike-growth",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Spirit Guardians",
        "url" => "https://www.dndbeyond.com/spells/2619078-spirit-guardians",
        "legacy_url" => "https://www.dndbeyond.com/spells/2264-spirit-guardians",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Spirit of Death",
        "url" => "https://www.dndbeyond.com/spells/2158657-spirit-of-death",
        "legacy_url" => null,
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Spirit Shroud",
        "url" => "https://www.dndbeyond.com/spells/718581-spirit-shroud",
        "legacy_url" => null,
        "spell_school" => "necromancy",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Spiritual Weapon",
        "url" => "https://www.dndbeyond.com/spells/2619081-spiritual-weapon",
        "legacy_url" => "https://www.dndbeyond.com/spells/2263-spiritual-weapon",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Spray of Cards",
        "url" => "https://www.dndbeyond.com/spells/2158658-spray-of-cards",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Staggering Smite",
        "url" => "https://www.dndbeyond.com/spells/2619084-staggering-smite",
        "legacy_url" => "https://www.dndbeyond.com/spells/2350-staggering-smite",
        "spell_school" => "evocation",
        "components" => "V",
        "spell_level" => "4th"
      ],
      [
        "name" => "Starry Wisp",
        "url" => "https://www.dndbeyond.com/spells/2618840-starry-wisp",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Steel Wind Strike",
        "url" => "https://www.dndbeyond.com/spells/2619087-steel-wind-strike",
        "legacy_url" => "https://www.dndbeyond.com/spells/14602-steel-wind-strike",
        "spell_school" => "conjuration",
        "components" => "S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Stinking Cloud",
        "url" => "https://www.dndbeyond.com/spells/2619091-stinking-cloud",
        "legacy_url" => "https://www.dndbeyond.com/spells/2265-stinking-cloud",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Stone Shape",
        "url" => "https://www.dndbeyond.com/spells/2619092-stone-shape",
        "legacy_url" => "https://www.dndbeyond.com/spells/2267-stone-shape",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Stoneskin",
        "url" => "https://www.dndbeyond.com/spells/2619095-stoneskin",
        "legacy_url" => "https://www.dndbeyond.com/spells/2266-stoneskin",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Storm of Vengeance",
        "url" => "https://www.dndbeyond.com/spells/2619098-storm-of-vengeance",
        "legacy_url" => "https://www.dndbeyond.com/spells/2268-storm-of-vengeance",
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "9th"
      ],
      [
        "name" => "Storm Sphere",
        "url" => "https://www.dndbeyond.com/spells/2400-storm-sphere",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "4th"
      ],
      [
        "name" => "Suggestion",
        "url" => "https://www.dndbeyond.com/spells/2619101-suggestion",
        "legacy_url" => "https://www.dndbeyond.com/spells/2269-suggestion",
        "spell_school" => "enchantment",
        "components" => "V, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Summon Aberration",
        "url" => "https://www.dndbeyond.com/spells/2619105-summon-aberration",
        "legacy_url" => "https://www.dndbeyond.com/spells/718613-summon-aberration",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Summon Beast",
        "url" => "https://www.dndbeyond.com/spells/2619106-summon-beast",
        "legacy_url" => "https://www.dndbeyond.com/spells/721187-summon-beast",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Summon Celestial",
        "url" => "https://www.dndbeyond.com/spells/2619108-summon-celestial",
        "legacy_url" => "https://www.dndbeyond.com/spells/721194-summon-celestial",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Summon Construct",
        "url" => "https://www.dndbeyond.com/spells/2619111-summon-construct",
        "legacy_url" => "https://www.dndbeyond.com/spells/721195-summon-construct",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Summon Draconic Spirit",
        "url" => "https://www.dndbeyond.com/spells/1183868-summon-draconic-spirit",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Summon Dragon",
        "url" => "https://www.dndbeyond.com/spells/2618843-summon-dragon",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Summon Elemental",
        "url" => "https://www.dndbeyond.com/spells/2619113-summon-elemental",
        "legacy_url" => "https://www.dndbeyond.com/spells/721199-summon-elemental",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Summon Fey",
        "url" => "https://www.dndbeyond.com/spells/2619115-summon-fey",
        "legacy_url" => "https://www.dndbeyond.com/spells/721204-summon-fey",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Summon Fiend",
        "url" => "https://www.dndbeyond.com/spells/2619117-summon-fiend",
        "legacy_url" => "https://www.dndbeyond.com/spells/719934-summon-fiend",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Summon Greater Demon",
        "url" => "https://www.dndbeyond.com/spells/14603-summon-greater-demon",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Summon Lesser Demons",
        "url" => "https://www.dndbeyond.com/spells/14604-summon-lesser-demons",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Summon Shadowspawn",
        "url" => "https://www.dndbeyond.com/spells/719948-summon-shadowspawn",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Summon Undead",
        "url" => "https://www.dndbeyond.com/spells/2619119-summon-undead",
        "legacy_url" => "https://www.dndbeyond.com/spells/719951-summon-undead",
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Sunbeam",
        "url" => "https://www.dndbeyond.com/spells/2619121-sunbeam",
        "legacy_url" => "https://www.dndbeyond.com/spells/2270-sunbeam",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Sunburst",
        "url" => "https://www.dndbeyond.com/spells/2619123-sunburst",
        "legacy_url" => "https://www.dndbeyond.com/spells/2271-sunburst",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "8th"
      ],
      [
        "name" => "Swift Quiver",
        "url" => "https://www.dndbeyond.com/spells/2619125-swift-quiver",
        "legacy_url" => "https://www.dndbeyond.com/spells/2357-swift-quiver",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Sword Burst",
        "url" => "https://www.dndbeyond.com/spells/2413-sword-burst",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Symbol",
        "url" => "https://www.dndbeyond.com/spells/2619127-symbol",
        "legacy_url" => "https://www.dndbeyond.com/spells/2272-symbol",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "7th"
      ],
      [
        "name" => "Synaptic Static",
        "url" => "https://www.dndbeyond.com/spells/2619129-synaptic-static",
        "legacy_url" => "https://www.dndbeyond.com/spells/14605-synaptic-static",
        "spell_school" => "enchantment",
        "components" => "V, S",
        "spell_level" => "5th"
      ],
      [
        "name" => "Tasha's Bubbling Cauldron",
        "url" => "https://www.dndbeyond.com/spells/2618841-tashas-bubbling-cauldron",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Tasha's Caustic Brew",
        "url" => "https://www.dndbeyond.com/spells/719953-tashas-caustic-brew",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Tasha's Hideous Laughter",
        "url" => "https://www.dndbeyond.com/spells/2619132-tashas-hideous-laughter",
        "legacy_url" => "https://www.dndbeyond.com/spells/2320-tashas-hideous-laughter",
        "spell_school" => "enchantment",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Tasha's Mind Whip",
        "url" => "https://www.dndbeyond.com/spells/719959-tashas-mind-whip",
        "legacy_url" => null,
        "spell_school" => "enchantment",
        "components" => "V",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Tasha's Otherworldly Guise",
        "url" => "https://www.dndbeyond.com/spells/719961-tashas-otherworldly-guise",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Telekinesis",
        "url" => "https://www.dndbeyond.com/spells/2619157-telekinesis",
        "legacy_url" => "https://www.dndbeyond.com/spells/2273-telekinesis",
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "5th"
      ],
      [
        "name" => "Telepathic Bond",
        "url" => null,
        "legacy_url" => "https://www.dndbeyond.com/spells/2274-telepathic-bond",
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Telepathy",
        "url" => "https://www.dndbeyond.com/spells/2619159-telepathy",
        "legacy_url" => "https://www.dndbeyond.com/spells/2364-telepathy",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "8th"
      ],
      [
        "name" => "Teleport",
        "url" => "https://www.dndbeyond.com/spells/2619163-teleport",
        "legacy_url" => "https://www.dndbeyond.com/spells/2275-teleport",
        "spell_school" => "conjuration",
        "components" => "V",
        "spell_level" => "7th"
      ],
      [
        "name" => "Teleportation Circle",
        "url" => "https://www.dndbeyond.com/spells/2619167-teleportation-circle",
        "legacy_url" => "https://www.dndbeyond.com/spells/2276-teleportation-circle",
        "spell_school" => "conjuration",
        "components" => "V, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Temple of the Gods",
        "url" => "https://www.dndbeyond.com/spells/14606-temple-of-the-gods",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "7th"
      ],
      [
        "name" => "Temporal Shunt",
        "url" => "https://www.dndbeyond.com/spells/416809-temporal-shunt",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "5th"
      ],
      [
        "name" => "Tenser's Floating Disk",
        "url" => "https://www.dndbeyond.com/spells/2619169-tensers-floating-disk",
        "legacy_url" => "https://www.dndbeyond.com/spells/2321-tensers-floating-disk",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Tenser's Transformation",
        "url" => "https://www.dndbeyond.com/spells/14612-tensers-transformation",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Tether Essence",
        "url" => "https://www.dndbeyond.com/spells/416810-tether-essence",
        "legacy_url" => null,
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "7th"
      ],
      [
        "name" => "Thaumaturgy",
        "url" => "https://www.dndbeyond.com/spells/2619174-thaumaturgy",
        "legacy_url" => "https://www.dndbeyond.com/spells/2277-thaumaturgy",
        "spell_school" => "transmutation",
        "components" => "V",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Conjure Volley",
        "url" => "https://www.dndbeyond.com/spells/2619050-conjure-volley",
        "legacy_url" => "https://www.dndbeyond.com/spells/2354-conjure-volley",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Conjure Woodland Beings",
        "url" => "https://www.dndbeyond.com/spells/2619051-conjure-woodland-beings",
        "legacy_url" => "https://www.dndbeyond.com/spells/2044-conjure-woodland-beings",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Contact Other Plane",
        "url" => "https://www.dndbeyond.com/spells/2619052-contact-other-plane",
        "legacy_url" => "https://www.dndbeyond.com/spells/2045-contact-other-plane",
        "spell_school" => "divination",
        "components" => "V",
        "spell_level" => "5th"
      ],
      [
        "name" => "Contagion",
        "url" => "https://www.dndbeyond.com/spells/2619063-contagion",
        "legacy_url" => "https://www.dndbeyond.com/spells/2046-contagion",
        "spell_school" => "necromancy",
        "components" => "V, S",
        "spell_level" => "5th"
      ],
      [
        "name" => "Contaminated Power",
        "url" => "https://www.dndbeyond.com/spells/2221548-contaminated-power",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "8th"
      ],
      [
        "name" => "Contamination Immunity",
        "url" => "https://www.dndbeyond.com/spells/2221549-contamination-immunity",
        "legacy_url" => null,
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "7th"
      ],
      [
        "name" => "Contingency",
        "url" => "https://www.dndbeyond.com/spells/2619053-contingency",
        "legacy_url" => "https://www.dndbeyond.com/spells/2047-contingency",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Continual Flame",
        "url" => "https://www.dndbeyond.com/spells/2619065-continual-flame",
        "legacy_url" => "https://www.dndbeyond.com/spells/2048-continual-flame",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Control Flames",
        "url" => "https://www.dndbeyond.com/spells/2374-control-flames",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Control Water",
        "url" => "https://www.dndbeyond.com/spells/2619070-control-water",
        "legacy_url" => "https://www.dndbeyond.com/spells/2049-control-water",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Control Weather",
        "url" => "https://www.dndbeyond.com/spells/2619054-control-weather",
        "legacy_url" => "https://www.dndbeyond.com/spells/2050-control-weather",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "8th"
      ],
      [
        "name" => "Control Winds",
        "url" => "https://www.dndbeyond.com/spells/2375-control-winds",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "5th"
      ],
      [
        "name" => "Thorn Whip",
        "url" => "https://www.dndbeyond.com/spells/2619176-thorn-whip",
        "legacy_url" => "https://www.dndbeyond.com/spells/2309-thorn-whip",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Thunder Step",
        "url" => "https://www.dndbeyond.com/spells/14613-thunder-step",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Thunderclap",
        "url" => "https://www.dndbeyond.com/spells/2619179-thunderclap",
        "legacy_url" => "https://www.dndbeyond.com/spells/2401-thunderclap",
        "spell_school" => "evocation",
        "components" => "S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Thunderous Smite",
        "url" => "https://www.dndbeyond.com/spells/2619182-thunderous-smite",
        "legacy_url" => "https://www.dndbeyond.com/spells/2322-thunderous-smite",
        "spell_school" => "evocation",
        "components" => "V",
        "spell_level" => "1st"
      ],
      [
        "name" => "Thunderwave",
        "url" => "https://www.dndbeyond.com/spells/2619184-thunderwave",
        "legacy_url" => "https://www.dndbeyond.com/spells/2278-thunderwave",
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Tidal Wave",
        "url" => "https://www.dndbeyond.com/spells/2402-tidal-wave",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Time Ravage",
        "url" => "https://www.dndbeyond.com/spells/416811-time-ravage",
        "legacy_url" => null,
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "9th"
      ],
      [
        "name" => "Time Stop",
        "url" => "https://www.dndbeyond.com/spells/2619185-time-stop",
        "legacy_url" => "https://www.dndbeyond.com/spells/2279-time-stop",
        "spell_school" => "transmutation",
        "components" => "V",
        "spell_level" => "9th"
      ],
      [
        "name" => "Tiny Hut",
        "url" => null,
        "legacy_url" => "https://www.dndbeyond.com/spells/2280-tiny-hut",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Tiny Servant",
        "url" => "https://www.dndbeyond.com/spells/14614-tiny-servant",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Toll the Dead",
        "url" => "https://www.dndbeyond.com/spells/2619188-toll-the-dead",
        "legacy_url" => "https://www.dndbeyond.com/spells/14615-toll-the-dead",
        "spell_school" => "necromancy",
        "components" => "V, S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Tongues",
        "url" => null,
        "legacy_url" => "https://www.dndbeyond.com/spells/2281-tongues",
        "spell_school" => "divination",
        "components" => "V, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "True Resurrection",
        "url" => "https://www.dndbeyond.com/spells/2619199-true-resurrection",
        "legacy_url" => "https://www.dndbeyond.com/spells/2285-true-resurrection",
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "9th"
      ],
      [
        "name" => "True Seeing",
        "url" => "https://www.dndbeyond.com/spells/2619201-true-seeing",
        "legacy_url" => "https://www.dndbeyond.com/spells/2286-true-seeing",
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "True Strike",
        "url" => "https://www.dndbeyond.com/spells/2619204-true-strike",
        "legacy_url" => "https://www.dndbeyond.com/spells/2287-true-strike",
        "spell_school" => "divination",
        "components" => "S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Tsunami",
        "url" => "https://www.dndbeyond.com/spells/2619206-tsunami",
        "legacy_url" => "https://www.dndbeyond.com/spells/2365-tsunami",
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "8th"
      ],
      [
        "name" => "Unseen Servant",
        "url" => "https://www.dndbeyond.com/spells/2619209-unseen-servant",
        "legacy_url" => "https://www.dndbeyond.com/spells/2288-unseen-servant",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Vampiric Touch",
        "url" => "https://www.dndbeyond.com/spells/2619214-vampiric-touch",
        "legacy_url" => "https://www.dndbeyond.com/spells/2289-vampiric-touch",
        "spell_school" => "necromancy",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Vicious Mockery",
        "url" => "https://www.dndbeyond.com/spells/2619216-vicious-mockery",
        "legacy_url" => "https://www.dndbeyond.com/spells/2290-vicious-mockery",
        "spell_school" => "enchantment",
        "components" => "V",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Vitriolic Sphere",
        "url" => "https://www.dndbeyond.com/spells/2619219-vitriolic-sphere",
        "legacy_url" => "https://www.dndbeyond.com/spells/2404-vitriolic-sphere",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Vortex Warp",
        "url" => "https://www.dndbeyond.com/spells/1239805-vortex-warp",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Wall of Fire",
        "url" => "https://www.dndbeyond.com/spells/2619107-wall-of-fire",
        "legacy_url" => "https://www.dndbeyond.com/spells/2291-wall-of-fire",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Wall of Force",
        "url" => "https://www.dndbeyond.com/spells/2619194-wall-of-force",
        "legacy_url" => "https://www.dndbeyond.com/spells/2292-wall-of-force",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Wall of Ice",
        "url" => "https://www.dndbeyond.com/spells/2619195-wall-of-ice",
        "legacy_url" => "https://www.dndbeyond.com/spells/2293-wall-of-ice",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Wall of Light",
        "url" => "https://www.dndbeyond.com/spells/14616-wall-of-light",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Wall of Sand",
        "url" => "https://www.dndbeyond.com/spells/2405-wall-of-sand",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Wall of Stone",
        "url" => "https://www.dndbeyond.com/spells/2619200-wall-of-stone",
        "legacy_url" => "https://www.dndbeyond.com/spells/2294-wall-of-stone",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Wall of Thorns",
        "url" => "https://www.dndbeyond.com/spells/2619202-wall-of-thorns",
        "legacy_url" => "https://www.dndbeyond.com/spells/2295-wall-of-thorns",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Wall of Water",
        "url" => "https://www.dndbeyond.com/spells/2406-wall-of-water",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Warding Bond",
        "url" => "https://www.dndbeyond.com/spells/2619203-warding-bond",
        "legacy_url" => "https://www.dndbeyond.com/spells/2296-warding-bond",
        "spell_school" => "abjuration",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Warding Wind",
        "url" => "https://www.dndbeyond.com/spells/2407-warding-wind",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Warp Bolt",
        "url" => "https://www.dndbeyond.com/spells/2221560-warp-bolt",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Warp Sense",
        "url" => "https://www.dndbeyond.com/spells/2119579-warp-sense",
        "legacy_url" => null,
        "spell_school" => "divination",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Water Breathing",
        "url" => "https://www.dndbeyond.com/spells/2619205-water-breathing",
        "legacy_url" => "https://www.dndbeyond.com/spells/2297-water-breathing",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Water Walk",
        "url" => "https://www.dndbeyond.com/spells/2619207-water-walk",
        "legacy_url" => "https://www.dndbeyond.com/spells/2298-water-walk",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Watery Sphere",
        "url" => "https://www.dndbeyond.com/spells/2408-watery-sphere",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Encode Thoughts",
        "url" => "https://www.dndbeyond.com/spells/83532-encode-thoughts",
        "legacy_url" => null,
        "spell_school" => "enchantment",
        "components" => "S",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Enemies Abound",
        "url" => "https://www.dndbeyond.com/spells/14836-enemies-abound",
        "legacy_url" => null,
        "spell_school" => "enchantment",
        "components" => "V, S",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Enervation",
        "url" => "https://www.dndbeyond.com/spells/14869-enervation",
        "legacy_url" => null,
        "spell_school" => "necromancy",
        "components" => "V, S",
        "spell_level" => "5th"
      ],
      [
        "name" => "Enhance Ability",
        "url" => "https://www.dndbeyond.com/spells/2619165-enhance-ability",
        "legacy_url" => "https://www.dndbeyond.com/spells/2083-enhance-ability",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Enlarge/Reduce",
        "url" => "https://www.dndbeyond.com/spells/2619170-enlarge-reduce",
        "legacy_url" => "https://www.dndbeyond.com/spells/2084-enlarge-reduce",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Ensnaring Strike",
        "url" => "https://www.dndbeyond.com/spells/2619172-ensnaring-strike",
        "legacy_url" => "https://www.dndbeyond.com/spells/2315-ensnaring-strike",
        "spell_school" => "conjuration",
        "components" => "V",
        "spell_level" => "1st"
      ],
      [
        "name" => "Entangle",
        "url" => "https://www.dndbeyond.com/spells/2619186-entangle",
        "legacy_url" => "https://www.dndbeyond.com/spells/2085-entangle",
        "spell_school" => "conjuration",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Enthrall",
        "url" => "https://www.dndbeyond.com/spells/2619192-enthrall",
        "legacy_url" => "https://www.dndbeyond.com/spells/2086-enthrall",
        "spell_school" => "enchantment",
        "components" => "V, S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Erupting Earth",
        "url" => "https://www.dndbeyond.com/spells/2380-erupting-earth",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Etherealness",
        "url" => "https://www.dndbeyond.com/spells/2619193-etherealness",
        "legacy_url" => "https://www.dndbeyond.com/spells/2087-etherealness",
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "7th"
      ],
      [
        "name" => "Evard's Black Tentacles",
        "url" => "https://www.dndbeyond.com/spells/2619187-evards-black-tentacles",
        "legacy_url" => "https://www.dndbeyond.com/spells/2344-evards-black-tentacles",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "4th"
      ],
      [
        "name" => "Expeditious Retreat",
        "url" => "https://www.dndbeyond.com/spells/2619189-expeditious-retreat",
        "legacy_url" => "https://www.dndbeyond.com/spells/2088-expeditious-retreat",
        "spell_school" => "transmutation",
        "components" => "V, S",
        "spell_level" => "1st"
      ],
      [
        "name" => "Wrathful Smite",
        "url" => "https://www.dndbeyond.com/spells/2619220-wrathful-smite",
        "legacy_url" => "https://www.dndbeyond.com/spells/2324-wrathful-smite",
        "spell_school" => "necromancy",
        "components" => "V",
        "spell_level" => "1st"
      ],
      [
        "name" => "Wristpocket",
        "url" => "https://www.dndbeyond.com/spells/416812-wristpocket",
        "legacy_url" => null,
        "spell_school" => "conjuration",
        "components" => "S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Yolande's Regal Presence",
        "url" => "https://www.dndbeyond.com/spells/2618842-yolandes-regal-presence",
        "legacy_url" => null,
        "spell_school" => "enchantment",
        "components" => "V, S, M",
        "spell_level" => "5th"
      ],
      [
        "name" => "Zephyr Strike",
        "url" => "https://www.dndbeyond.com/spells/14622-zephyr-strike",
        "legacy_url" => null,
        "spell_school" => "transmutation",
        "components" => "V",
        "spell_level" => "1st"
      ],
      [
        "name" => "Zone of Truth",
        "url" => "https://www.dndbeyond.com/spells/2619221-zone-of-truth",
        "legacy_url" => "https://www.dndbeyond.com/spells/2305-zone-of-truth",
        "spell_school" => "enchantment",
        "components" => "V, S",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Web",
        "url" => "https://www.dndbeyond.com/spells/2619208-web",
        "legacy_url" => "https://www.dndbeyond.com/spells/2299-web",
        "spell_school" => "conjuration",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Weird",
        "url" => "https://www.dndbeyond.com/spells/2619210-weird",
        "legacy_url" => "https://www.dndbeyond.com/spells/2300-weird",
        "spell_school" => "illusion",
        "components" => "V, S",
        "spell_level" => "9th"
      ],
      [
        "name" => "Whirlwind",
        "url" => "https://www.dndbeyond.com/spells/2409-whirlwind",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, M",
        "spell_level" => "7th"
      ],
      [
        "name" => "Wind Walk",
        "url" => "https://www.dndbeyond.com/spells/2619211-wind-walk",
        "legacy_url" => "https://www.dndbeyond.com/spells/2301-wind-walk",
        "spell_school" => "transmutation",
        "components" => "V, S, M",
        "spell_level" => "6th"
      ],
      [
        "name" => "Wind Wall",
        "url" => "https://www.dndbeyond.com/spells/2619212-wind-wall",
        "legacy_url" => "https://www.dndbeyond.com/spells/2302-wind-wall",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "3rd"
      ],
      [
        "name" => "Wish",
        "url" => "https://www.dndbeyond.com/spells/2619213-wish",
        "legacy_url" => "https://www.dndbeyond.com/spells/2303-wish",
        "spell_school" => "conjuration",
        "components" => "V",
        "spell_level" => "9th"
      ],
      [
        "name" => "Witch Bolt",
        "url" => "https://www.dndbeyond.com/spells/2619215-witch-bolt",
        "legacy_url" => "https://www.dndbeyond.com/spells/2323-witch-bolt",
        "spell_school" => "evocation",
        "components" => "V, S, M",
        "spell_level" => "1st"
      ],
      [
        "name" => "Wither and Bloom",
        "url" => "https://www.dndbeyond.com/spells/1239806-wither-and-bloom",
        "legacy_url" => null,
        "spell_school" => "necromancy",
        "components" => "V, S, M",
        "spell_level" => "2nd"
      ],
      [
        "name" => "Word of Radiance",
        "url" => "https://www.dndbeyond.com/spells/2619217-word-of-radiance",
        "legacy_url" => "https://www.dndbeyond.com/spells/14618-word-of-radiance",
        "spell_school" => "evocation",
        "components" => "V, M",
        "spell_level" => "Cantrip"
      ],
      [
        "name" => "Word of Recall",
        "url" => "https://www.dndbeyond.com/spells/2619218-word-of-recall",
        "legacy_url" => "https://www.dndbeyond.com/spells/2304-word-of-recall",
        "spell_school" => "conjuration",
        "components" => "V",
        "spell_level" => "6th"
      ],
      [
        "name" => "Wrath of Nature",
        "url" => "https://www.dndbeyond.com/spells/14619-wrath-of-nature",
        "legacy_url" => null,
        "spell_school" => "evocation",
        "components" => "V, S",
        "spell_level" => "5th"
      ]
    ];


    foreach ($spells as $data) {
      $levelString = $data['spell_level'];
      if (strtolower($levelString) === 'cantrip') {
        $spellLevel = 0;
      } else {
        $spellLevel = (int)preg_replace('/\D/', '', $levelString);
      }

      $spell = new Spell;
      $spell->name = $data['name'];
      $spell->url = $data['url'];
      $spell->legacy_url = $data['legacy_url'];
      $spell->spell_school = $data['spell_school'];
      $spell->spell_level = $spellLevel;
      $spell->save();
    }
  }
}
