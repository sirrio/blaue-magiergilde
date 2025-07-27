<?php

namespace Database\Seeders;

use App\Models\CharacterClass;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CharacterClassSeeder extends Seeder
{
  /**
   * Run the database seeds.
   */
  public function run(): void
  {
    $classes = [
      'Artificer' => '/images/artificer.jpeg',
      'Barbarian' => '/images/barbarian.jpeg',
      'Bard' => '/images/bard.jpeg',
      'Blood Hunter' => '/images/bloodhunter.jpeg',
      'Cleric' => '/images/cleric.jpeg',
      'Druid' => '/images/druid.jpeg',
      'Fighter' => '/images/fighter.jpeg',
      'Monk' => '/images/monk.jpeg',
      'Paladin' => '/images/paladin.jpeg',
      'Ranger' => '/images/ranger.jpeg',
      'Rogue' => '/images/rogue.jpeg',
      'Sorcerer' => '/images/sorcerer.jpeg',
      'Warlock' => '/images/warlock.jpeg',
      'Wizard' => '/images/wizard.jpeg',
    ];
    foreach ($classes as $class => $src) {
      CharacterClass::factory()->create([
        'name' => $class,
        'src' => $src
      ]);
    }
  }
}
