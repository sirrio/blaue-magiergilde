<?php

namespace App\Services;

use App\Models\Item;
use App\Models\Source;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class CompendiumItemSourceResolverService
{
    /**
     * @return array{
     *     summary: array<string, int|bool>,
     *     rows: list<array<string, string>>,
     *     results: list<array<string, mixed>>
     * }
     */
    public function resolveForImport(bool $onlyMissing = true, int $limit = 0, int $timeout = 15): array
    {
        $query = Item::query()
            ->select([
                'id',
                'name',
                'type',
                'rarity',
                'cost',
                'extra_cost_note',
                'url',
                'guild_enabled',
                'shop_enabled',
                'ruling_changed',
                'ruling_note',
                'source_id',
            ])
            ->whereNotNull('url')
            ->where('url', '!=', '')
            ->where('url', 'like', 'https://www.dndbeyond.com/%')
            ->orderBy('id');

        if ($onlyMissing) {
            $query->whereNull('source_id');
        }

        if ($limit > 0) {
            $query->limit($limit);
        }

        $sourceLookup = $this->buildSourceLookup();
        $urlResolutions = [];
        $summary = [
            'processed_items' => 0,
            'unique_urls' => 0,
            'resolved_items' => 0,
            'exported_rows' => 0,
            'http_failed_items' => 0,
            'unresolved_items' => 0,
            'ambiguous_source_items' => 0,
            'ambiguous_import_items' => 0,
            'only_missing' => $onlyMissing,
        ];
        $rows = [];
        $results = [];

        foreach ($query->cursor() as $item) {
            $summary['processed_items']++;

            $url = trim((string) $item->url);
            if (! array_key_exists($url, $urlResolutions)) {
                $summary['unique_urls']++;
                $urlResolutions[$url] = $this->resolveUrlSource($url, $sourceLookup, $timeout);
            }

            /** @var array<string, mixed> $resolution */
            $resolution = $urlResolutions[$url];
            $result = [
                'item_id' => $item->id,
                'name' => $item->name,
                'type' => $item->type,
                'url' => $url,
                'status' => $resolution['status'],
                'matched_label' => $resolution['matched_label'] ?? null,
                'candidate_labels' => $resolution['candidate_labels'] ?? [],
                'source_shortcode' => $resolution['source_shortcode'] ?? null,
                'source_name' => $resolution['source_name'] ?? null,
                'import_ready' => false,
                'import_issue' => null,
            ];

            if ($resolution['status'] === 'resolved') {
                $summary['resolved_items']++;
                $importIssue = $this->determineImportIssue($item);
                if ($importIssue !== null) {
                    $summary['ambiguous_import_items']++;
                    $result['status'] = 'ambiguous_import';
                    $result['import_issue'] = $importIssue;
                    $results[] = $result;

                    continue;
                }

                $rows[] = $this->buildImportRow($item, (string) $resolution['source_shortcode']);
                $summary['exported_rows']++;
                $result['import_ready'] = true;
                $results[] = $result;

                continue;
            }

            if ($resolution['status'] === 'http_failed') {
                $summary['http_failed_items']++;
            } elseif ($resolution['status'] === 'ambiguous_source') {
                $summary['ambiguous_source_items']++;
            } else {
                $summary['unresolved_items']++;
            }

            $results[] = $result;
        }

        return [
            'summary' => $summary,
            'rows' => $rows,
            'results' => $results,
        ];
    }

    /**
     * @param  array{
     *     exact: array<string, array{id:int,name:string,shortcode:string,normalized:string}>,
     *     aliases: array<string, array{id:int,name:string,shortcode:string,normalized:string}>,
     *     list: list<array{id:int,name:string,shortcode:string,normalized:string}>
     * }  $sourceLookup
     * @return array<string, mixed>
     */
    private function resolveUrlSource(string $url, array $sourceLookup, int $timeout): array
    {
        $response = Http::withHeaders([
            'User-Agent' => 'BlaueMagiergildeCompendiumResolver/1.0',
            'Accept' => 'text/html,application/xhtml+xml',
        ])
            ->withOptions(['stream' => true])
            ->timeout(max(1, $timeout))
            ->retry(2, 250, throw: false)
            ->get($url);

        if ($response->failed()) {
            return [
                'status' => 'http_failed',
                'http_status' => $response->status(),
                'matched_label' => null,
                'candidate_labels' => [],
            ];
        }

        $candidateLabels = $this->extractCandidateLabels($this->readResponseSnippet($response));
        $response->close();

        foreach ($candidateLabels as $candidateLabel) {
            $match = $this->matchSourceLabel($candidateLabel, $sourceLookup);
            if ($match['status'] !== 'unresolved') {
                $match['candidate_labels'] = $candidateLabels;

                return $match;
            }
        }

        return [
            'status' => 'unresolved',
            'matched_label' => null,
            'candidate_labels' => $candidateLabels,
        ];
    }

    /**
     * @return array{
     *     exact: array<string, array{id:int,name:string,shortcode:string,normalized:string}>,
     *     aliases: array<string, array{id:int,name:string,shortcode:string,normalized:string}>,
     *     list: list<array{id:int,name:string,shortcode:string,normalized:string}>
     * }
     */
    private function buildSourceLookup(): array
    {
        $exact = [];
        $aliases = [];
        $list = [];

        foreach (Source::query()->orderBy('shortcode')->get(['id', 'name', 'shortcode']) as $source) {
            $descriptor = [
                'id' => $source->id,
                'name' => $source->name,
                'shortcode' => $source->shortcode,
                'normalized' => $this->normalizeSourceLabel($source->name),
            ];

            $exact[$descriptor['normalized']] = $descriptor;
            $list[] = $descriptor;
        }

        foreach ($this->sourceAliases() as $alias => $shortcode) {
            $source = collect($list)->firstWhere('shortcode', $shortcode);
            if ($source === null) {
                continue;
            }

            $aliases[$this->normalizeSourceLabel($alias)] = $source;
        }

        return [
            'exact' => $exact,
            'aliases' => $aliases,
            'list' => $list,
        ];
    }

    /**
     * @param  array{
     *     exact: array<string, array{id:int,name:string,shortcode:string,normalized:string}>,
     *     aliases: array<string, array{id:int,name:string,shortcode:string,normalized:string}>,
     *     list: list<array{id:int,name:string,shortcode:string,normalized:string}>
     * }  $sourceLookup
     * @return array<string, mixed>
     */
    private function matchSourceLabel(string $candidateLabel, array $sourceLookup): array
    {
        $normalizedCandidate = $this->normalizeSourceLabel($candidateLabel);
        if ($normalizedCandidate === '') {
            return [
                'status' => 'unresolved',
                'matched_label' => null,
            ];
        }

        if (array_key_exists($normalizedCandidate, $sourceLookup['exact'])) {
            $source = $sourceLookup['exact'][$normalizedCandidate];

            return [
                'status' => 'resolved',
                'matched_label' => $candidateLabel,
                'source_id' => $source['id'],
                'source_name' => $source['name'],
                'source_shortcode' => $source['shortcode'],
            ];
        }

        if (array_key_exists($normalizedCandidate, $sourceLookup['aliases'])) {
            $source = $sourceLookup['aliases'][$normalizedCandidate];

            return [
                'status' => 'resolved',
                'matched_label' => $candidateLabel,
                'source_id' => $source['id'],
                'source_name' => $source['name'],
                'source_shortcode' => $source['shortcode'],
            ];
        }

        $fuzzyMatches = array_values(array_filter(
            $sourceLookup['list'],
            static fn (array $source): bool => str_contains($source['normalized'], $normalizedCandidate)
                || str_contains($normalizedCandidate, $source['normalized']),
        ));

        if (count($fuzzyMatches) === 1) {
            $source = $fuzzyMatches[0];

            return [
                'status' => 'resolved',
                'matched_label' => $candidateLabel,
                'source_id' => $source['id'],
                'source_name' => $source['name'],
                'source_shortcode' => $source['shortcode'],
            ];
        }

        if (count($fuzzyMatches) > 1) {
            return [
                'status' => 'ambiguous_source',
                'matched_label' => $candidateLabel,
                'matched_sources' => array_map(
                    static fn (array $source): array => [
                        'id' => $source['id'],
                        'name' => $source['name'],
                        'shortcode' => $source['shortcode'],
                    ],
                    $fuzzyMatches,
                ),
            ];
        }

        return [
            'status' => 'unresolved',
            'matched_label' => null,
        ];
    }

    /**
     * @return list<string>
     */
    private function extractCandidateLabels(string $html): array
    {
        $candidates = [];

        preg_match_all('/<title[^>]*>(.*?)<\/title>/is', $html, $titleMatches);
        foreach ($titleMatches[1] ?? [] as $match) {
            $candidates[] = $this->cleanCandidateLabel((string) $match);
        }

        preg_match_all('/<meta[^>]+(?:property|name)=["\'](?:og:title|twitter:title)["\'][^>]+content=["\'](.*?)["\'][^>]*>/is', $html, $metaMatches);
        foreach ($metaMatches[1] ?? [] as $match) {
            $candidates[] = $this->cleanCandidateLabel((string) $match);
        }

        return array_values(array_unique(array_filter($candidates, static fn (string $value): bool => $value !== '')));
    }

    private function cleanCandidateLabel(string $value): string
    {
        $label = html_entity_decode(strip_tags(trim($value)), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $label = preg_replace('/\s+-\s+Shop\s+D&D Beyond$/iu', '', $label) ?? $label;
        $label = preg_replace('/\s+\|\s+Shop\s+D&D Beyond$/iu', '', $label) ?? $label;
        $label = preg_replace('/\s+-\s+Marketplace\s+-\s+D&D Beyond$/iu', '', $label) ?? $label;
        $label = preg_replace('/\s+\|\s+Marketplace\s+\|\s+D&D Beyond$/iu', '', $label) ?? $label;
        $label = preg_replace('/\s+-\s+D&D Beyond$/iu', '', $label) ?? $label;
        $label = preg_replace('/\s+\|\s+D&D Beyond$/iu', '', $label) ?? $label;

        return trim($label);
    }

    private function readResponseSnippet(\Illuminate\Http\Client\Response $response, int $maxBytes = 262144): string
    {
        $resource = $response->resource();
        if (! is_resource($resource)) {
            return '';
        }

        $remaining = max(1024, $maxBytes);
        $snippet = '';

        while (! feof($resource) && $remaining > 0) {
            $chunkSize = min(8192, $remaining);
            $chunk = fread($resource, $chunkSize);

            if ($chunk === false || $chunk === '') {
                break;
            }

            $snippet .= $chunk;
            $remaining -= strlen($chunk);

            if (str_contains($snippet, '</head>')) {
                break;
            }
        }

        return $snippet;
    }

    private function normalizeSourceLabel(string $value): string
    {
        $normalized = Str::of($value)
            ->ascii()
            ->lower()
            ->replaceMatches('/\b(19|20)\d{2}\b/u', ' ')
            ->replace(['&', '/', ':', '-', '_', '\'', '’', '.', ',', '(', ')'], ' ')
            ->replaceMatches('/[^a-z0-9 ]+/u', ' ')
            ->squish()
            ->value();

        return trim($normalized);
    }

    /**
     * @return array<string, string>
     */
    private function sourceAliases(): array
    {
        return [
            'Heroes of Faerun' => 'FRHOF',
            'Forgotten Realms Heroes of Faerun' => 'FRHOF',
            'Dragonlance Shadow Dragon Queen' => 'DSDQ',
        ];
    }

    private function determineImportIssue(Item $item): ?string
    {
        $url = trim((string) $item->url);
        if ($url === '') {
            return 'missing_url';
        }

        $urlMatches = Item::query()
            ->where('url', $url)
            ->count();

        if ($urlMatches !== 1) {
            return 'duplicate_url';
        }

        return null;
    }

    /**
     * @return array<string, string>
     */
    private function buildImportRow(Item $item, string $sourceShortcode): array
    {
        return [
            'name' => (string) $item->name,
            'type' => (string) $item->type,
            'rarity' => (string) $item->rarity,
            'cost' => $item->cost === null ? '' : (string) $item->cost,
            'extra_cost_note' => $item->extra_cost_note === null ? '' : (string) $item->extra_cost_note,
            'url' => (string) $item->url,
            'source_shortcode' => $sourceShortcode,
            'guild_enabled' => $item->guild_enabled ? 'true' : 'false',
            'shop_enabled' => $item->shop_enabled ? 'true' : 'false',
            'ruling_changed' => $item->ruling_changed ? 'true' : 'false',
            'ruling_note' => $item->ruling_note === null ? '' : (string) $item->ruling_note,
        ];
    }
}
