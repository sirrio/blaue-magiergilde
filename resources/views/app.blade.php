<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" data-theme="{{ $appearance }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="csrf-token" content="{{ csrf_token() }}">

  {{-- Inline script to detect system dark mode preference and apply it immediately --}}
  <script>
    (function() {
      const appearance = '{{ $appearance ?? "system" }}'

      const setTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme)
      }

      if (appearance === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setTheme(prefersDark ? 'dark' : 'light')

        if (prefersDark) {
          document.documentElement.classList.add('dark')
        }
      } else {
        setTheme(appearance)
      }
    })()
  </script>

  {{-- Inline style to set the HTML background color based on our theme in app.css --}}
  <style>
    html {
      background-color: oklch(1 0 0);
    }

    html.dark {
      background-color: oklch(0.145 0 0);
    }
  </style>

  @php
    $environmentFavicon = match (app()->environment()) {
        'local' => [
            'title' => 'Local',
            'background' => '#f59e0b',
            'foreground' => '#111827',
        ],
        'staging' => [
            'title' => 'Staging',
            'background' => '#ef4444',
            'foreground' => '#ffffff',
        ],
        default => null,
    };

    $environmentFaviconHref = null;

    if ($environmentFavicon !== null) {
        $environmentFaviconSvg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="{$environmentFavicon['background']}"/>
  <path d="M18 18h28v10H30v8h14v10H30v18H18V18Z" fill="{$environmentFavicon['foreground']}"/>
</svg>
SVG;

        $environmentFaviconHref = 'data:image/svg+xml,'.rawurlencode($environmentFaviconSvg);
    }
  @endphp

  <title inertia>{{ config('app.name', 'Laravel') }}</title>

  <link rel="preconnect" href="https://fonts.bunny.net">
  <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

  @if($environmentFaviconHref)
    <link rel="icon" type="image/svg+xml" href="{{ $environmentFaviconHref }}" />
    <link rel="shortcut icon" href="{{ $environmentFaviconHref }}" />
  @else
    <link rel="icon" type="image/png" href="/favicons/favicon-96x96.png" sizes="96x96" />
    <link rel="icon" type="image/svg+xml" href="/favicons/favicon.svg" />
    <link rel="shortcut icon" href="/favicons/favicon.ico" />
  @endif
  <link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-title" content="Blaue Magiergilde" />
  <link rel="manifest" href="/favicons/site.webmanifest" />

  @routes
  @unless(app()->runningUnitTests())
    @viteReactRefresh
    @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
  @endunless
  @inertiaHead
</head>
<body class="font-sans antialiased">
@inertia
</body>
</html>
