<?php

namespace App\Console\Commands;

use App\Models\Adventure;
use App\Models\Character;
use App\Models\CharacterClass;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * @phpstan-type AdventureFixture array{
 *     duration: int,
 *     start_date: string,
 *     is_pseudo?: bool,
 *     target_level?: int,
 *     has_additional_bubble?: bool,
 *     title?: string|null,
 *     game_master?: string|null
 * }
 *
 * @phpstan-type CharacterFixture array{
 *     name: string,
 *     class_name: string,
 *     guild_status: 'draft'|'pending'|'approved'|'declined'|'needs_changes'|'retired',
 *     start_tier: 'bt'|'lt'|'ht',
 *     is_filler: bool,
 *     dm_bubbles: int,
 *     dm_coins?: int,
 *     bubble_shop_spend?: int,
 *     simplified_tracking?: bool,
 *     avatar_masked?: bool,
 *     faction?: string,
 *     avatar?: string|null,
 *     registration_note?: string|null,
 *     review_note?: string|null,
 *     notes?: string|null,
 *     manual_adventures_count?: int|null,
 *     manual_faction_rank?: int|null,
 *     manual_total_downtime_seconds?: int|null,
 *     adventures?: list<AdventureFixture>
 * }
 */
class SeedCharacterReviewFixturesCommand extends Command
{
    protected $signature = 'characters:seed-review-fixtures
                            {user : User ID or email address}
                            {--force : Soft-delete the user\'s current visible characters before seeding fixtures}';

    protected $description = 'Replace one user\'s current characters with a deterministic review fixture set';

    public function handle(): int
    {
        if (! $this->option('force')) {
            $this->error('This command replaces the user\'s current visible characters. Re-run with --force.');

            return self::FAILURE;
        }

        $user = $this->resolveUser((string) $this->argument('user'));
        if (! $user instanceof User) {
            $this->error('User not found. Provide a valid user ID or email address.');

            return self::FAILURE;
        }

        $fixtureDefinitions = $this->fixtureDefinitions();
        $createdCount = 0;
        $softDeletedCount = 0;

        DB::transaction(function () use ($user, $fixtureDefinitions, &$createdCount, &$softDeletedCount): void {
            $softDeletedCount = $this->softDeleteCurrentCharacters($user);

            foreach ($fixtureDefinitions as $index => $fixture) {
                $characterClass = CharacterClass::query()->where('name', $fixture['class_name'])->first();
                if (! $characterClass instanceof CharacterClass) {
                    $characterClass = new CharacterClass;
                    $characterClass->name = $fixture['class_name'];
                    $characterClass->src = sprintf('https://fixtures.example/classes/%s.png', strtolower(str_replace(' ', '-', $fixture['class_name'])));
                    $characterClass->save();
                }

                $character = new Character;
                $character->user_id = $user->getKey();
                $character->name = $fixture['name'];
                $character->external_link = sprintf('https://www.dndbeyond.com/characters/%d', 98000000 + $index);
                $character->start_tier = $fixture['start_tier'];
                $character->version = '2024';
                $character->dm_bubbles = $fixture['dm_bubbles'];
                $character->dm_coins = $fixture['dm_coins'] ?? 0;
                $character->bubble_shop_spend = $fixture['bubble_shop_spend'] ?? 0;
                $character->is_filler = $fixture['is_filler'];
                $character->faction = $fixture['faction'] ?? 'none';
                $character->notes = $fixture['notes'] ?? null;
                $character->position = $index + 1;
                $character->simplified_tracking = $fixture['simplified_tracking'] ?? (bool) $user->simplified_tracking;
                $character->avatar_masked = $fixture['avatar_masked'] ?? (bool) ($user->avatar_masked ?? true);
                $character->avatar = $fixture['avatar'] ?? null;
                $character->private_mode = false;
                $character->guild_status = $fixture['guild_status'];
                $character->registration_note = $fixture['registration_note'] ?? null;
                $character->review_note = $fixture['review_note'] ?? null;
                $character->manual_adventures_count = array_key_exists('manual_adventures_count', $fixture) ? $fixture['manual_adventures_count'] : null;
                $character->manual_faction_rank = array_key_exists('manual_faction_rank', $fixture) ? $fixture['manual_faction_rank'] : null;
                $character->manual_total_downtime_seconds = array_key_exists('manual_total_downtime_seconds', $fixture) ? $fixture['manual_total_downtime_seconds'] : null;
                $character->save();

                $character->characterClasses()->sync([$characterClass->getKey()]);

                foreach ($fixture['adventures'] ?? [] as $adventureData) {
                    $adventure = new Adventure;
                    $adventure->character_id = $character->getKey();
                    $adventure->duration = $adventureData['duration'];
                    $adventure->start_date = $adventureData['start_date'];
                    $adventure->is_pseudo = $adventureData['is_pseudo'] ?? false;
                    $adventure->target_level = $adventureData['target_level'] ?? null;
                    $adventure->has_additional_bubble = $adventureData['has_additional_bubble'] ?? false;
                    $adventure->title = $adventureData['title'] ?? null;
                    $adventure->game_master = $adventureData['game_master'] ?? null;
                    $adventure->progression_version_id = null;
                    $adventure->save();
                }

                $createdCount++;
            }
        });

        $this->info(sprintf(
            'Soft-deleted %d current character%s for %s and seeded %d review fixture character%s.',
            $softDeletedCount,
            $softDeletedCount === 1 ? '' : 's',
            $user->email ?? '#'.$user->getKey(),
            $createdCount,
            $createdCount === 1 ? '' : 's',
        ));

        return self::SUCCESS;
    }

    private function resolveUser(string $value): ?User
    {
        if (is_numeric($value)) {
            return User::query()->find((int) $value);
        }

        return User::query()->where('email', $value)->first();
    }

    private function softDeleteCurrentCharacters(User $user): int
    {
        $characters = Character::query()
            ->where('user_id', $user->getKey())
            ->whereNull('deleted_at')
            ->with(['adventures', 'downtimes'])
            ->orderBy('id')
            ->get();

        foreach ($characters as $character) {
            if ($character->guild_status === 'approved') {
                $character->guild_status = 'retired';
                $character->save();
            }

            $character->adventures()->update([
                'deleted_by_character' => true,
            ]);
            $character->downtimes()->update([
                'deleted_by_character' => true,
            ]);

            $character->adventures()->delete();
            $character->downtimes()->delete();
            $character->delete();
        }

        return $characters->count();
    }

    private function avatar(string $seed): string
    {
        return sprintf(
            'https://api.dicebear.com/9.x/personas/png?seed=%s&size=200',
            urlencode($seed)
        );
    }

    /** @return list<AdventureFixture> */
    private function realAdventures(int $count, int $durationSeconds = 10800): array
    {
        $adventures = [];
        for ($i = 0; $i < $count; $i++) {
            $adventures[] = [
                'duration' => $durationSeconds,
                'start_date' => now()->subMonths($count - $i)->format('Y-m-d'),
                'title' => null,
                'game_master' => null,
            ];
        }

        return $adventures;
    }

    /** @return list<AdventureFixture> */
    private function pseudoAdventure(int $targetLevel): array
    {
        return [[
            'duration' => 0,
            'start_date' => now()->subMonths(3)->format('Y-m-d'),
            'is_pseudo' => true,
            'target_level' => $targetLevel,
        ]];
    }

    /**
     * @return list<CharacterFixture>
     */
    private function fixtureDefinitions(): array
    {
        return [
            // ── Standard BT Approved (4 Slots) ───────────────────────────
            [
                'name' => 'Fixture 01 - Standard BT Approved',
                'class_name' => 'Fighter',
                'guild_status' => 'approved',
                'start_tier' => 'bt',
                'is_filler' => false,
                'dm_bubbles' => 0,
                'faction' => 'gardisten',
                'avatar' => $this->avatar('brave-fighter'),
                'adventures' => $this->realAdventures(5),
            ],
            [
                'name' => 'Fixture 02 - Standard BT Approved',
                'class_name' => 'Rogue',
                'guild_status' => 'approved',
                'start_tier' => 'bt',
                'is_filler' => false,
                'dm_bubbles' => 0,
                'faction' => 'agenten',
                'avatar' => $this->avatar('sneaky-rogue'),
                'adventures' => $this->realAdventures(3),
            ],
            [
                'name' => 'Fixture 03 - Standard BT Approved',
                'class_name' => 'Wizard',
                'guild_status' => 'approved',
                'start_tier' => 'bt',
                'is_filler' => false,
                'dm_bubbles' => 0,
                'faction' => 'arkanisten',
                'avatar' => $this->avatar('scholarly-wizard'),
                'adventures' => $this->realAdventures(7),
            ],
            [
                'name' => 'Fixture 04 - Standard BT Approved',
                'class_name' => 'Cleric',
                'guild_status' => 'approved',
                'start_tier' => 'bt',
                'is_filler' => false,
                'dm_bubbles' => 8,
                'dm_coins' => 3,
                'faction' => 'heiler',
                'avatar' => $this->avatar('devoted-cleric'),
                'adventures' => $this->realAdventures(4),
            ],
            // ── Standard LT Approved ─────────────────────────────────────
            [
                'name' => 'Fixture 05 - Standard LT Approved',
                'class_name' => 'Ranger',
                'guild_status' => 'approved',
                'start_tier' => 'lt',
                'is_filler' => false,
                'dm_bubbles' => 0,
                'faction' => 'feldforscher',
                'avatar' => $this->avatar('wandering-ranger'),
                'adventures' => $this->realAdventures(6),
            ],
            [
                'name' => 'Fixture 06 - Standard LT Approved',
                'class_name' => 'Druid',
                'guild_status' => 'approved',
                'start_tier' => 'lt',
                'is_filler' => false,
                'dm_bubbles' => 0,
                'faction' => 'flora & fauna',
                'avatar' => $this->avatar('nature-druid'),
                'adventures' => $this->realAdventures(4),
            ],
            [
                'name' => 'Fixture 07 - Standard LT Approved',
                'class_name' => 'Bard',
                'guild_status' => 'approved',
                'start_tier' => 'lt',
                'is_filler' => false,
                'dm_bubbles' => 12,
                'dm_coins' => 5,
                'faction' => 'unterhalter',
                'avatar' => $this->avatar('charismatic-bard'),
                'adventures' => $this->realAdventures(5),
            ],
            // ── Pending ──────────────────────────────────────────────────
            [
                'name' => 'Fixture 08 - Standard LT Pending',
                'class_name' => 'Paladin',
                'guild_status' => 'pending',
                'start_tier' => 'lt',
                'is_filler' => false,
                'dm_bubbles' => 0,
                'faction' => 'diplomaten',
                'avatar' => $this->avatar('holy-paladin'),
                'registration_note' => 'Pending standard slot example.',
                'adventures' => $this->realAdventures(2),
            ],
            // ── HT ───────────────────────────────────────────────────────
            [
                'name' => 'Fixture 09 - HT Extra Approved',
                'class_name' => 'Warlock',
                'guild_status' => 'approved',
                'start_tier' => 'ht',
                'is_filler' => false,
                'dm_bubbles' => 0,
                'faction' => 'bibliothekare',
                'avatar' => $this->avatar('dark-warlock'),
                'adventures' => $this->realAdventures(8),
            ],
            [
                'name' => 'Fixture 10 - HT Extra Pending',
                'class_name' => 'Sorcerer',
                'guild_status' => 'pending',
                'start_tier' => 'ht',
                'is_filler' => false,
                'dm_bubbles' => 0,
                'avatar' => $this->avatar('arcane-sorcerer'),
                'registration_note' => 'Pending high-tier extra slot example.',
            ],
            // ── Filler ───────────────────────────────────────────────────
            [
                'name' => 'Fixture 11 - Filler Pending',
                'class_name' => 'Monk',
                'guild_status' => 'pending',
                'start_tier' => 'bt',
                'is_filler' => true,
                'dm_bubbles' => 0,
                'avatar' => $this->avatar('peaceful-monk'),
                'registration_note' => 'Existing submitted filler example.',
                'adventures' => $this->realAdventures(2),
            ],
            // ── ET Approved ───────────────────────────────────────────────
            [
                'name' => 'Fixture 12 - ET Approved',
                'class_name' => 'Barbarian',
                'guild_status' => 'approved',
                'start_tier' => 'ht',
                'is_filler' => false,
                'dm_bubbles' => 135,
                'dm_coins' => 40,
                'faction' => 'waffenmeister',
                'avatar' => $this->avatar('fierce-barbarian'),
                'adventures' => $this->realAdventures(12),
            ],
            // ── Draft ─────────────────────────────────────────────────────
            [
                'name' => 'Fixture 13 - Draft Blocked by Standard Slots',
                'class_name' => 'Artificer',
                'guild_status' => 'draft',
                'start_tier' => 'bt',
                'is_filler' => false,
                'dm_bubbles' => 0,
                'avatar' => $this->avatar('tinkerer-artificer'),
                'notes' => 'Should show the standard slot blocker before submit.',
            ],
            [
                'name' => 'Fixture 14 - Draft Blocked by Filler Slot',
                'class_name' => 'Monk',
                'guild_status' => 'draft',
                'start_tier' => 'bt',
                'is_filler' => true,
                'dm_bubbles' => 0,
                'avatar' => $this->avatar('draft-monk'),
                'notes' => 'Should show the filler slot blocker before submit.',
            ],
            [
                'name' => 'Fixture 15 - Draft ET Allowed',
                'class_name' => 'Wizard',
                'guild_status' => 'draft',
                'start_tier' => 'ht',
                'is_filler' => false,
                'dm_bubbles' => 135,
                'avatar' => $this->avatar('draft-wizard'),
                'notes' => 'Draft ET example that remains submit-eligible.',
            ],
            // ── Review States ─────────────────────────────────────────────
            [
                'name' => 'Fixture 16 - Needs Changes ET',
                'class_name' => 'Cleric',
                'guild_status' => 'needs_changes',
                'start_tier' => 'ht',
                'is_filler' => false,
                'dm_bubbles' => 135,
                'avatar' => $this->avatar('needs-changes-cleric'),
                'registration_note' => 'Earlier registration details.',
                'review_note' => 'Please update the linked details before resubmitting.',
            ],
            [
                'name' => 'Fixture 17 - Declined Example',
                'class_name' => 'Ranger',
                'guild_status' => 'declined',
                'start_tier' => 'bt',
                'is_filler' => false,
                'dm_bubbles' => 0,
                'avatar' => $this->avatar('declined-ranger'),
                'review_note' => 'Declined example for UI review messaging.',
                'adventures' => $this->realAdventures(3),
            ],
            [
                'name' => 'Fixture 18 - Retired Example',
                'class_name' => 'Fighter',
                'guild_status' => 'retired',
                'start_tier' => 'lt',
                'is_filler' => false,
                'dm_bubbles' => 0,
                'faction' => 'gardisten',
                'avatar' => $this->avatar('retired-fighter'),
                'adventures' => $this->realAdventures(10),
            ],

            // ── Tracking-Modus Coverage (draft → zählen nicht gegen Limits) ─
            [
                'name' => 'Fixture 19 - Level-Tracking (Pseudo, Null-Overrides)',
                'class_name' => 'Sorcerer',
                'guild_status' => 'draft',
                'start_tier' => 'bt',
                'is_filler' => false,
                'dm_bubbles' => 5,
                'faction' => 'arkanisten',
                'simplified_tracking' => true,
                'avatar' => $this->avatar('level-tracking-sorcerer'),
                'adventures' => $this->pseudoAdventure(7),
                // manual_* deliberately absent → shows — in all fields
            ],
            [
                'name' => 'Fixture 20 - Level-Tracking (Overrides gesetzt)',
                'class_name' => 'Paladin',
                'guild_status' => 'draft',
                'start_tier' => 'lt',
                'is_filler' => false,
                'dm_bubbles' => 10,
                'dm_coins' => 8,
                'faction' => 'diplomaten',
                'simplified_tracking' => true,
                'avatar' => $this->avatar('override-paladin'),
                'adventures' => $this->pseudoAdventure(9),
                'manual_adventures_count' => 12,
                'manual_faction_rank' => 2,
                'manual_total_downtime_seconds' => 14400,
            ],
            [
                'name' => 'Fixture 21 - Gemischtes Tracking (Pseudo + Real)',
                'class_name' => 'Artificer',
                'guild_status' => 'draft',
                'start_tier' => 'bt',
                'is_filler' => false,
                'dm_bubbles' => 3,
                'faction' => 'handwerker',
                'simplified_tracking' => false,
                'avatar' => $this->avatar('mixed-tracking-artificer'),
                'adventures' => array_merge(
                    $this->pseudoAdventure(4),
                    $this->realAdventures(3)
                ),
            ],
            [
                // ET (target_level=20) → zählt nicht gegen Standard- oder HT-Limits
                'name' => 'Fixture 22 - Max Level (Level-Tracking, ET)',
                'class_name' => 'Barbarian',
                'guild_status' => 'approved',
                'start_tier' => 'ht',
                'is_filler' => false,
                'dm_bubbles' => 200,
                'dm_coins' => 60,
                'faction' => 'waffenmeister',
                'simplified_tracking' => true,
                'avatar_masked' => false,
                'avatar' => $this->avatar('max-level-barbarian'),
                'adventures' => $this->pseudoAdventure(20),
                'manual_adventures_count' => 35,
                'manual_faction_rank' => 5,
                'manual_total_downtime_seconds' => 108000,
            ],
            [
                'name' => 'Fixture 23 - Token sichtbar (Abenteuer-Tracking)',
                'class_name' => 'Bard',
                'guild_status' => 'draft',
                'start_tier' => 'bt',
                'is_filler' => false,
                'dm_bubbles' => 18,
                'dm_coins' => 12,
                'bubble_shop_spend' => 3,
                'faction' => 'unterhalter',
                'simplified_tracking' => false,
                'avatar_masked' => false,
                'avatar' => $this->avatar('unmasked-bard'),
                'adventures' => $this->realAdventures(6),
            ],
            [
                'name' => 'Fixture 24 - Bubble-Shop + GM-Rewards',
                'class_name' => 'Rogue',
                'guild_status' => 'draft',
                'start_tier' => 'bt',
                'is_filler' => false,
                'dm_bubbles' => 45,
                'dm_coins' => 20,
                'bubble_shop_spend' => 5,
                'faction' => 'agenten',
                'avatar' => $this->avatar('wealthy-rogue'),
                'adventures' => $this->realAdventures(8),
            ],
        ];
    }
}
