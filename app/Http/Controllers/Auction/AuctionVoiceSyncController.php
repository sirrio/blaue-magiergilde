<?php

namespace App\Http\Controllers\Auction;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\SyncAuctionVoiceRequest;
use App\Models\Auction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Http;

class AuctionVoiceSyncController extends Controller
{
    /**
     * Sync voice channel members via the bot HTTP endpoint.
     */
    public function __invoke(SyncAuctionVoiceRequest $request, Auction $auction): RedirectResponse
    {
        if (! $auction->voice_channel_id) {
            return redirect()->back()->withErrors([
                'voice_sync' => 'Keine Voice Channel ID gesetzt.',
            ]);
        }

        $botUrl = trim((string) config('services.bot.http_url', ''));
        $botToken = trim((string) config('services.bot.http_token', ''));

        if ($botUrl === '' || $botToken === '') {
            return redirect()->back()->withErrors([
                'voice_sync' => 'Bot HTTP ist nicht konfiguriert.',
            ]);
        }

        try {
            $response = Http::timeout(10)
                ->acceptJson()
                ->withHeaders(['X-Bot-Token' => $botToken])
                ->post(rtrim($botUrl, '/').'/voice-sync', [
                    'channel_id' => $auction->voice_channel_id,
                ]);
        } catch (\Throwable $error) {
            return redirect()->back()->withErrors([
                'voice_sync' => 'Bot ist nicht erreichbar.',
            ]);
        }

        if (! $response->ok()) {
            return redirect()->back()->withErrors([
                'voice_sync' => 'Bot-Request fehlgeschlagen.',
            ]);
        }

        $payload = $response->json();
        $members = is_array($payload['members'] ?? null) ? $payload['members'] : null;

        if (! is_array($members)) {
            return redirect()->back()->withErrors([
                'voice_sync' => 'Ungueltige Bot-Antwort.',
            ]);
        }

        $auction->voice_candidates = $members;
        $auction->voice_updated_at = now();
        $auction->save();

        return redirect()->back();
    }
}
