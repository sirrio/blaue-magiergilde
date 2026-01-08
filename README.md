# blaue-magiergilde

## Overview

Laravel 12 + React/Inertia app for RPG data (characters, items, spells, games) with a Discord bot in `bot/`. The app
includes auctions, an item shop, and admin character management.

## Setup

Install PHP dependencies:

```bash
composer install
```

Install Node dependencies:

```bash
npm ci
```

Copy the environment file and generate the application key:

```bash
cp .env.example .env
php artisan key:generate
```

Run database migrations (ensure `database/database.sqlite` exists when using SQLite):

```bash
touch database/database.sqlite
php artisan migrate
```

## Development scripts

Run the tests:

```bash
vendor/bin/pest
```

Lint the code:

```bash
npm run lint
```

Type-check the frontend:

```bash
npm run types
```

## Discord bot

The bot lives in `bot/` and shares the root `.env` with the app. See `bot/README.md` for commands and configuration.

## Admin character management

Admins manage character approvals at `/registrations` (approve/decline, filters, admin notes).

## Auctions

Auctions are managed in-app (items, bids, hidden bids, auto rollover). The bot has no auction commands.
