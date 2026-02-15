<?php

namespace App\Http\Controllers\Character;

use App\Http\Controllers\Controller;
use App\Http\Resources\CharacterDownloadResource;
use App\Models\Character;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DownloadCharacterController extends Controller
{
    public function __invoke(Request $request, Character $character): StreamedResponse
    {
        $userId = Auth::user()?->getAuthIdentifier();
        if (! $userId || $character->user_id !== $userId) {
            abort(403);
        }

        $character->loadMissing(['adventures', 'downtimes', 'allies', 'characterClasses']);

        $data = CharacterDownloadResource::make($character)->resolve();
        $format = strtolower((string) $request->query('format', 'json'));

        if ($format === 'pretty') {
            $fileName = 'character_'.$character->id.'.md';
            $content = $this->buildPrettyContent($data, $character);

            return response()->streamDownload(
                fn () => print ($content),
                $fileName,
                ['Content-Type' => 'text/markdown; charset=UTF-8']
            );
        }

        $fileName = 'character_'.$character->id.'.json';

        return response()->streamDownload(
            fn () => print (json_encode($data, JSON_PRETTY_PRINT)),
            $fileName,
            ['Content-Type' => 'application/json']
        );
    }

    private function buildPrettyContent(array $data, Character $character): string
    {
        $lines = [
            '# Character Export',
            '',
            'Name: '.((string) ($data['name'] ?? $character->name ?? '-')),
            'Faction: '.((string) ($data['faction'] ?? '-')),
            'Version: '.((string) ($data['version'] ?? '-')),
            'Start Tier: '.strtoupper((string) ($data['start_tier'] ?? '-')),
            'Guild Status: '.((string) ($character->guild_status ?? '-')),
            'Is Filler: '.((($data['is_filler'] ?? false) ? 'Yes' : 'No')),
            'External Link: '.((string) ($data['external_link'] ?? '-')),
            '',
            '## Progress',
            'DM Bubbles: '.((string) ($data['dm_bubbles'] ?? 0)),
            'DM Coins: '.((string) ($data['dm_coins'] ?? 0)),
            'Bubble Shop Spend: '.((string) ($data['bubble_shop_spend'] ?? 0)),
            '',
            '## Notes',
            (string) ($data['notes'] ?? '-'),
            '',
            '## Classes',
        ];

        $classes = collect($data['classes'] ?? [])->filter()->values();
        if ($classes->isEmpty()) {
            $lines[] = '- None';
        } else {
            foreach ($classes as $className) {
                $lines[] = '- '.(string) $className;
            }
        }

        $lines[] = '';
        $lines[] = '## Allies';
        $allies = collect($data['allies'] ?? [])->values();
        if ($allies->isEmpty()) {
            $lines[] = '- None';
        } else {
            foreach ($allies as $ally) {
                $name = (string) ($ally['name'] ?? 'Unknown');
                $rating = (string) ($ally['rating'] ?? '-');
                $lines[] = '- '.$name.' (Rating: '.$rating.')';
            }
        }

        $lines[] = '';
        $lines[] = '## Adventures';
        $adventures = collect($data['adventures'] ?? [])->values();
        if ($adventures->isEmpty()) {
            $lines[] = '- None';
        } else {
            foreach ($adventures as $adventure) {
                $title = (string) ($adventure['title'] ?? 'Adventure');
                $gameMaster = (string) ($adventure['game_master'] ?? '-');
                $date = (string) ($adventure['date'] ?? '-');
                $duration = (int) ($adventure['duration'] ?? 0);
                $hours = $duration > 0 ? rtrim(rtrim(number_format($duration / 3600, 2, '.', ''), '0'), '.') : '0';
                $bonusBubble = (bool) ($adventure['bonus_bubble'] ?? false) ? 'Yes' : 'No';
                $pseudo = (bool) ($adventure['is_pseudo'] ?? false) ? 'Yes' : 'No';
                $lines[] = '- '.$title.' | GM: '.$gameMaster.' | Date: '.$date.' | Duration: '.$hours.'h | Bonus Bubble: '.$bonusBubble.' | Auto: '.$pseudo;
            }
        }

        $lines[] = '';
        $lines[] = '## Downtimes';
        $downtimes = collect($data['downtimes'] ?? [])->values();
        if ($downtimes->isEmpty()) {
            $lines[] = '- None';
        } else {
            foreach ($downtimes as $downtime) {
                $type = (string) ($downtime['type'] ?? '-');
                $date = (string) ($downtime['date'] ?? '-');
                $duration = (int) ($downtime['duration'] ?? 0);
                $hours = $duration > 0 ? rtrim(rtrim(number_format($duration / 3600, 2, '.', ''), '0'), '.') : '0';
                $lines[] = '- '.ucfirst($type).' | Date: '.$date.' | Duration: '.$hours.'h';
            }
        }

        return implode("\n", $lines)."\n";
    }
}
