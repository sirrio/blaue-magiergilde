<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $timestamp = now();

        DB::table('sources')->upsert([
            ['name' => 'Abomination Vaults Adventure Path', 'shortcode' => 'AVAP', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Acquisitions Incorporated', 'shortcode' => 'AI', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => "Baldur's Gate: Descent into Avernus", 'shortcode' => 'BGDIA', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Candlekeep Mysteries', 'shortcode' => 'CM', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Critical Role: Call of the Netherdeep', 'shortcode' => 'COTN', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Curse of Strahd', 'shortcode' => 'COS', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Dragonlance: Shadow of the Dragon Queen', 'shortcode' => 'DSDQ', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Ghosts of Saltmarsh', 'shortcode' => 'GOS', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => "Guildmasters' Guide to Ravnica", 'shortcode' => 'GGR', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Grim Hollow: Campaign Guide', 'shortcode' => 'GHCG', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Grim Hollow: Player Pack', 'shortcode' => 'GHPP', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Icewind Dale: Rime of the Frostmaiden', 'shortcode' => 'IDROTF', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Infernal Machine Rebuild', 'shortcode' => 'IMR', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Lairs of Etharis', 'shortcode' => 'LOE', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Lost Laboratory of Kwalish', 'shortcode' => 'LLK', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Mythic Odysseys of Theros', 'shortcode' => 'MOT', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => "Netheril's Fall", 'shortcode' => 'NFALL', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Out of the Abyss', 'shortcode' => 'OOTA', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Phandelver and Below: The Shattered Obelisk', 'shortcode' => 'PBTSO', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Princes of the Apocalypse', 'shortcode' => 'POTA', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Quests from the Infinite Staircase', 'shortcode' => 'QFTIS', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Sleeping Dragon’s Wake', 'shortcode' => 'SDW', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Storm King’s Thunder', 'shortcode' => 'SKT', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Stranger Things: Welcome to the Hellfire Club', 'shortcode' => 'STWTHC', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Strixhaven: A Curriculum of Chaos', 'shortcode' => 'SACOC', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => "Tasha's Cauldron of Everything", 'shortcode' => 'TCOE', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => "Tal'Dorei Campaign Setting Reborn", 'shortcode' => 'TDCSR', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Tales from the Yawning Portal', 'shortcode' => 'TYP', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'The Crooked Moon Part One: Player Options & Campaign Setting', 'shortcode' => 'TCM1', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => "The Griffon's Saddlebag: Book Two", 'shortcode' => 'GSB2', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'The Wild Beyond the Witchlight', 'shortcode' => 'TWBW', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Tomb of Annihilation', 'shortcode' => 'TOA', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Tyranny of Dragons', 'shortcode' => 'TOD', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Vecna: Eve of Ruin', 'shortcode' => 'VEOR', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Waterdeep: Dragon Heist', 'shortcode' => 'WDH', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => 'Waterdeep: Dungeon of the Mad Mage', 'shortcode' => 'WDOTMM', 'created_at' => $timestamp, 'updated_at' => $timestamp],
            ['name' => "Wayfinder's Guide to Eberron", 'shortcode' => 'WGE', 'created_at' => $timestamp, 'updated_at' => $timestamp],
        ], ['shortcode'], ['name', 'updated_at']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('sources')
            ->whereIn('shortcode', [
                'AI',
                'AVAP',
                'BGDIA',
                'CM',
                'COS',
                'COTN',
                'DSDQ',
                'GHCG',
                'GHPP',
                'GGR',
                'GOS',
                'GSB2',
                'IDROTF',
                'IMR',
                'LLK',
                'LOE',
                'MOT',
                'NFALL',
                'OOTA',
                'PBTSO',
                'POTA',
                'QFTIS',
                'SACOC',
                'SDW',
                'SKT',
                'STWTHC',
                'TCM1',
                'TCOE',
                'TDCSR',
                'TOA',
                'TOD',
                'TWBW',
                'TYP',
                'VEOR',
                'WDH',
                'WDOTMM',
                'WGE',
            ])
            ->delete();
    }
};
