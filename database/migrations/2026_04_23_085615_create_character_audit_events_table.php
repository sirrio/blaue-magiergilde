<?php

use App\Models\Character;
use App\Support\CharacterAuditTrail;
use App\Support\CharacterBubbleShop;
use App\Support\LevelProgression;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('character_audit_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('character_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 96);
            $table->timestamp('occurred_at');
            $table->string('subject_type', 128)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('delta')->nullable();
            $table->json('state_after')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['character_id', 'occurred_at', 'id'], 'character_audit_events_lookup_idx');
            $table->index(['character_id', 'action'], 'character_audit_events_action_idx');
            $table->index(['subject_type', 'subject_id'], 'character_audit_events_subject_idx');
        });

        $this->backfillCurrentCharacterState();
    }

    public function down(): void
    {
        Schema::dropIfExists('character_audit_events');
    }

    private function backfillCurrentCharacterState(): void
    {
        $auditTrail = app(CharacterAuditTrail::class);
        $bubbleShop = app(CharacterBubbleShop::class);

        Character::query()
            ->withTrashed()
            ->with([
                'adventures' => fn ($query) => $query->withTrashed()->orderByRaw('COALESCE(start_date, created_at) asc')->orderBy('id'),
                'downtimes' => fn ($query) => $query->withTrashed()->orderByRaw('COALESCE(start_date, created_at) asc')->orderBy('id'),
                'bubbleShopPurchases',
                'characterClasses:id',
                'auditEvents',
            ])
            ->orderBy('id')
            ->each(function (Character $character) use ($auditTrail, $bubbleShop): void {
                if ($character->auditEvents->isNotEmpty()) {
                    return;
                }

                $hiddenMetadata = [
                    'hidden_from_history' => true,
                    'backfilled' => true,
                    'source' => 'character_audit_events_migration',
                ];

                $startTierBonus = app(\App\Support\CharacterProgressionState::class)->startTierBonus($character->start_tier);
                $relevantAdventures = $character->adventures
                    ->filter(fn ($adventure) => ! $adventure->trashed() || ($character->trashed() && (bool) $adventure->deleted_by_character))
                    ->values();

                $levelAnchor = $relevantAdventures
                    ->filter(fn ($adventure) => (bool) ($adventure->getAttribute('is_pseudo') ?? false))
                    ->sortBy(fn ($adventure) => sprintf(
                        '%010d-%010d',
                        $this->timestamp($adventure->start_date, $adventure->created_at)->getTimestamp(),
                        (int) $adventure->id,
                    ))
                    ->last();

                $realAdventures = $relevantAdventures
                    ->reject(fn ($adventure) => (bool) ($adventure->getAttribute('is_pseudo') ?? false))
                    ->values();

                foreach ($realAdventures as $adventure) {
                    $adventureBubbles = intdiv((int) $adventure->duration, 10800) + ($adventure->has_additional_bubble ? 1 : 0);
                    $auditTrail->record($character, 'adventure.created', delta: [
                        'bubbles' => $adventureBubbles,
                    ], metadata: [
                        ...$hiddenMetadata,
                        'title' => $adventure->title,
                        'game_master' => $adventure->game_master,
                        'start_date' => optional($adventure->start_date)->toDateString(),
                        'has_additional_bubble' => (bool) $adventure->has_additional_bubble,
                    ], subject: $adventure, occurredAt: $this->timestamp($adventure->start_date, $adventure->created_at));
                }

                $relevantDowntimes = $character->downtimes
                    ->filter(fn ($downtime) => ! $downtime->trashed() || ($character->trashed() && (bool) $downtime->deleted_by_character))
                    ->values();

                $characterCreatedAt = $this->backfilledCharacterCreatedAt(
                    $character,
                    $relevantAdventures,
                    $relevantDowntimes,
                );

                $auditTrail->record($character, 'character.created', delta: [
                    'available_bubbles' => $startTierBonus,
                    'bubbles' => $startTierBonus,
                ], metadata: $hiddenMetadata, subject: $character, occurredAt: $characterCreatedAt);

                foreach ($relevantDowntimes as $downtime) {
                    $type = (string) ($downtime->type ?? 'other');
                    $auditTrail->record($character, 'downtime.created', delta: [
                        'downtime_seconds' => (int) $downtime->duration,
                    ], metadata: [
                        ...$hiddenMetadata,
                        'type' => $type === 'faction' ? 'faction' : 'other',
                        'start_date' => optional($downtime->start_date)->toDateString(),
                        'notes' => $downtime->notes,
                    ], subject: $downtime, occurredAt: $this->timestamp($downtime->start_date, $downtime->created_at));
                }

                $dmBubbles = max(0, (int) ($character->getAttribute('dm_bubbles') ?? 0));
                if ($dmBubbles > 0) {
                    $auditTrail->record($character, 'dm_bubbles.updated', delta: [
                        'bubbles' => $dmBubbles,
                        'dm_bubbles' => $dmBubbles,
                    ], metadata: $hiddenMetadata, subject: $character, occurredAt: $this->timestamp($character->updated_at ?? $character->created_at));
                }

                $dmCoins = max(0, (int) ($character->getAttribute('dm_coins') ?? 0));
                if ($dmCoins > 0) {
                    $auditTrail->record($character, 'dm_coins.updated', delta: [
                        'dm_coins' => $dmCoins,
                    ], metadata: $hiddenMetadata, subject: $character, occurredAt: $this->timestamp($character->updated_at ?? $character->created_at));
                }

                $quantities = $bubbleShop->quantitiesFor($character);
                $structuredSpend = $bubbleShop->structuredSpendForQuantities($character, $quantities);
                $legacySpend = max(0, (int) ($character->getAttribute('bubble_shop_spend') ?? 0));
                $effectiveSpend = max($structuredSpend, $legacySpend);

                if ($effectiveSpend > 0) {
                    $auditTrail->record($character, 'bubble_shop.updated', delta: [
                        'bubbles' => -$effectiveSpend,
                        'bubble_shop_spend' => $effectiveSpend,
                    ], metadata: [
                        ...$hiddenMetadata,
                        'previous_quantities' => array_fill_keys(CharacterBubbleShop::purchaseTypes(), 0),
                        'new_quantities' => $quantities,
                    ], subject: $character, occurredAt: $this->timestamp($character->updated_at ?? $character->created_at));
                }

                if ($levelAnchor !== null) {
                    $targetAvailableBubbles = $levelAnchor->getAttribute('target_bubbles');
                    $progressionVersionId = (int) ($character->progression_version_id ?: LevelProgression::activeVersionId());
                    $normalizedAvailableBubbles = is_numeric($targetAvailableBubbles)
                        ? max(0, (int) $targetAvailableBubbles)
                        : max(0, $startTierBonus + $dmBubbles - $effectiveSpend + $realAdventures->sum(fn ($adventure) => intdiv((int) $adventure->duration, 10800) + ($adventure->has_additional_bubble ? 1 : 0)));
                    $targetLevel = is_numeric($levelAnchor->getAttribute('target_level'))
                        ? max(1, min(20, (int) $levelAnchor->getAttribute('target_level')))
                        : LevelProgression::levelFromAvailableBubbles($normalizedAvailableBubbles, $progressionVersionId);
                    $levelFloor = LevelProgression::bubblesRequiredForLevel($targetLevel, $progressionVersionId);

                    $auditTrail->record($character, 'level.set', delta: [
                        'available_bubbles' => $normalizedAvailableBubbles,
                        'target_level' => $targetLevel,
                        'bubbles_in_level' => max(0, $normalizedAvailableBubbles - $levelFloor),
                    ], metadata: $hiddenMetadata, subject: $character, occurredAt: $this->timestamp(
                        $character->updated_at,
                        $levelAnchor->updated_at ?? $levelAnchor->created_at,
                    ));
                }

                if ($character->trashed()) {
                    $auditTrail->record($character, 'character.deleted', metadata: $hiddenMetadata, subject: $character, occurredAt: $this->timestamp($character->deleted_at));
                }
            });
    }

    private function timestamp(mixed $value, mixed $fallback = null): Carbon
    {
        if ($value instanceof Carbon) {
            return $value->copy();
        }

        $parsed = $this->parseTimestamp($value);
        if ($parsed !== null) {
            return $parsed;
        }

        $fallbackParsed = $this->parseTimestamp($fallback);
        if ($fallbackParsed !== null) {
            return $fallbackParsed;
        }

        return now();
    }

    private function parseTimestamp(mixed $value): ?Carbon
    {
        if ($value instanceof Carbon) {
            return $this->isUsableTimestamp($value) ? $value->copy() : null;
        }

        if ($value === null || $value === '') {
            return null;
        }

        if (is_string($value)) {
            $normalized = trim($value);

            if (! preg_match('/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2})?$/', $normalized)) {
                return null;
            }
        }

        try {
            $parsed = Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }

        return $this->isUsableTimestamp($parsed) ? $parsed : null;
    }

    private function isUsableTimestamp(Carbon $value): bool
    {
        return $value->year >= 2000 && $value->year <= ((int) now()->year + 1);
    }

    private function backfilledCharacterCreatedAt(Character $character, \Illuminate\Support\Collection $adventures, \Illuminate\Support\Collection $downtimes): Carbon
    {
        $candidateTimestamps = collect([
            $this->timestamp($character->created_at),
            ...$adventures->map(fn ($adventure) => $this->timestamp($adventure->start_date, $adventure->created_at))->all(),
            ...$downtimes->map(fn ($downtime) => $this->timestamp($downtime->start_date, $downtime->created_at))->all(),
        ])->filter(fn ($timestamp) => $timestamp instanceof Carbon)
            ->sort()
            ->values();

        $firstHistoricalTimestamp = $candidateTimestamps->first();
        if (! $firstHistoricalTimestamp instanceof Carbon) {
            return $this->timestamp($character->created_at);
        }

        if ($firstHistoricalTimestamp->greaterThanOrEqualTo($this->timestamp($character->created_at))) {
            return $this->timestamp($character->created_at);
        }

        return $firstHistoricalTimestamp->copy()->subSecond();
    }
};
