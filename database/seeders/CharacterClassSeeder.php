<?php

namespace Database\Seeders;

use App\Models\CharacterClass;
use Illuminate\Database\Seeder;

class CharacterClassSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $classes = [
            'Artificer',
            'Barbarian',
            'Bard',
            'Blood Hunter',
            'Cleric',
            'Druid',
            'Fighter',
            'Monk',
            'Paladin',
            'Pugilist',
            'Ranger',
            'Rogue',
            'Sorcerer',
            'Warlock',
            'Wizard',
        ];
        foreach ($classes as $class) {
            CharacterClass::query()->updateOrCreate(
                ['name' => $class],
            );
        }
    }
}
