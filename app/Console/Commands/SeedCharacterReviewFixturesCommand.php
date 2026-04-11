<?php

namespace App\Console\Commands;

use App\Models\Character;
use App\Models\CharacterClass;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * @phpstan-type CharacterFixture array{
 *     name: string,
 *     class_name: string,
 *     guild_status: 'draft'|'pending'|'approved'|'declined'|'needs_changes'|'retired',
 *     start_tier: 'bt'|'lt'|'ht',
 *     is_filler: bool,
 *     dm_bubbles: int,
 *     registration_note?: string|null,
 *     review_note?: string|null,
 *     notes?: string|null
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
                $character->dm_coins = 0;
                $character->bubble_shop_spend = 0;
                $character->is_filler = $fixture['is_filler'];
                $character->faction = 'none';
                $character->notes = $fixture['notes'] ?? null;
                $character->position = $index + 1;
                $character->simplified_tracking = (bool) $user->simplified_tracking;
                $character->avatar_masked = (bool) ($user->avatar_masked ?? true);
                $character->private_mode = false;
                $character->guild_status = $fixture['guild_status'];
                $character->registration_note = $fixture['registration_note'] ?? null;
                $character->review_note = $fixture['review_note'] ?? null;
                $character->save();

                $character->characterClasses()->sync([$characterClass->getKey()]);
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

    /**
     * @return list<CharacterFixture>
     */
    private function fixtureDefinitions(): array
    {
        return [
            [
                'name' => 'Fixture 01 - Standard BT Approved',
                'class_name' => 'Fighter',
                'guild_status' => 'approved',
                'start_tier' => 'bt',
                'is_filler' => false,
                'dm_bubbles' => 0,
            ],
            [
                'name' => 'Fixture 02 - Standard BT Approved',
                'class_name' => 'Rogue',
                'guild_status' => 'approved',
                'start_tier' => 'bt',
                'is_filler' => false,
                'dm_bubbles' => 0,
            ],
            [
                'name' => 'Fixture 03 - Standard BT Approved',
                'class_name' => 'Wizard',
                'guild_status' => 'approved',
                'start_tier' => 'bt',
                'is_filler' => false,
                'dm_bubbles' => 0,
            ],
            [
                'name' => 'Fixture 04 - Standard BT Approved',
                'class_name' => 'Cleric',
                'guild_status' => 'approved',
                'start_tier' => 'bt',
                'is_filler' => false,
                'dm_bubbles' => 0,
            ],
            [
                'name' => 'Fixture 05 - Standard LT Approved',
                'class_name' => 'Ranger',
                'guild_status' => 'approved',
                'start_tier' => 'lt',
                'is_filler' => false,
                'dm_bubbles' => 0,
            ],
            [
                'name' => 'Fixture 06 - Standard LT Approved',
                'class_name' => 'Druid',
                'guild_status' => 'approved',
                'start_tier' => 'lt',
                'is_filler' => false,
                'dm_bubbles' => 0,
            ],
            [
                'name' => 'Fixture 07 - Standard LT Approved',
                'class_name' => 'Bard',
                'guild_status' => 'approved',
                'start_tier' => 'lt',
                'is_filler' => false,
                'dm_bubbles' => 0,
            ],
            [
                'name' => 'Fixture 08 - Standard LT Pending',
                'class_name' => 'Paladin',
                'guild_status' => 'pending',
                'start_tier' => 'lt',
                'is_filler' => false,
                'dm_bubbles' => 0,
                'registration_note' => 'Pending standard slot example.',
            ],
            [
                'name' => 'Fixture 09 - HT Extra Approved',
                'class_name' => 'Warlock',
                'guild_status' => 'approved',
                'start_tier' => 'ht',
                'is_filler' => false,
                'dm_bubbles' => 0,
            ],
            [
                'name' => 'Fixture 10 - HT Extra Pending',
                'class_name' => 'Sorcerer',
                'guild_status' => 'pending',
                'start_tier' => 'ht',
                'is_filler' => false,
                'dm_bubbles' => 0,
                'registration_note' => 'Pending high-tier extra slot example.',
            ],
            [
                'name' => 'Fixture 11 - Filler Pending',
                'class_name' => 'Monk',
                'guild_status' => 'pending',
                'start_tier' => 'bt',
                'is_filler' => true,
                'dm_bubbles' => 0,
                'registration_note' => 'Existing submitted filler example.',
            ],
            [
                'name' => 'Fixture 12 - ET Approved',
                'class_name' => 'Barbarian',
                'guild_status' => 'approved',
                'start_tier' => 'ht',
                'is_filler' => false,
                'dm_bubbles' => 135,
            ],
            [
                'name' => 'Fixture 13 - Draft Blocked by Standard Slots',
                'class_name' => 'Artificer',
                'guild_status' => 'draft',
                'start_tier' => 'bt',
                'is_filler' => false,
                'dm_bubbles' => 0,
                'notes' => 'Should show the standard slot blocker before submit.',
            ],
            [
                'name' => 'Fixture 14 - Draft Blocked by Filler Slot',
                'class_name' => 'Monk',
                'guild_status' => 'draft',
                'start_tier' => 'bt',
                'is_filler' => true,
                'dm_bubbles' => 0,
                'notes' => 'Should show the filler slot blocker before submit.',
            ],
            [
                'name' => 'Fixture 15 - Draft ET Allowed',
                'class_name' => 'Wizard',
                'guild_status' => 'draft',
                'start_tier' => 'ht',
                'is_filler' => false,
                'dm_bubbles' => 135,
                'notes' => 'Draft ET example that remains submit-eligible.',
            ],
            [
                'name' => 'Fixture 16 - Needs Changes ET Allowed',
                'class_name' => 'Cleric',
                'guild_status' => 'needs_changes',
                'start_tier' => 'ht',
                'is_filler' => false,
                'dm_bubbles' => 135,
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
                'review_note' => 'Declined example for UI review messaging.',
            ],
            [
                'name' => 'Fixture 18 - Retired Example',
                'class_name' => 'Fighter',
                'guild_status' => 'retired',
                'start_tier' => 'lt',
                'is_filler' => false,
                'dm_bubbles' => 0,
            ],
        ];
    }
}
