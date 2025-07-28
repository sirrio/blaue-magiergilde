# blaue-magiergilde

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
