#!/bin/sh
set -eu

if [ ! -f .env ]; then
  cp .env.example .env
fi

php <<'PHP'
<?php

$path = getcwd() . '/.env';
$contents = file_get_contents($path);

if ($contents === false) {
    fwrite(STDERR, "Unable to read .env\n");
    exit(1);
}

$replacements = [
    'APP_NAME' => getenv('APP_NAME') ?: null,
    'APP_ENV' => getenv('APP_ENV') ?: null,
    'APP_DEBUG' => getenv('APP_DEBUG') ?: null,
    'APP_URL' => getenv('APP_URL') ?: null,
    'APP_KEY' => getenv('APP_KEY') ?: null,
    'DB_CONNECTION' => getenv('DB_CONNECTION') ?: null,
    'DB_HOST' => getenv('DB_HOST') ?: null,
    'DB_PORT' => getenv('DB_PORT') ?: null,
    'DB_DATABASE' => getenv('DB_DATABASE') ?: null,
    'DB_USERNAME' => getenv('DB_USERNAME') ?: null,
    'DB_PASSWORD' => getenv('DB_PASSWORD') ?: null,
    'INTERNAL_API_ISSUER' => getenv('INTERNAL_API_ISSUER') ?: null,
    'INTERNAL_API_AUDIENCE' => getenv('INTERNAL_API_AUDIENCE') ?: null,
    'INTERNAL_JWT_PUBLIC_KEY' => getenv('INTERNAL_JWT_PUBLIC_KEY') ?: null,
];

foreach ($replacements as $key => $value) {
    if ($value === null) {
        continue;
    }

    $escaped = str_replace(['\\', '"'], ['\\\\', '\\"'], $value);
    $line = sprintf('%s="%s"', $key, $escaped);

    if (preg_match('/^' . preg_quote($key, '/') . '=.*$/m', $contents) === 1) {
        $contents = preg_replace('/^' . preg_quote($key, '/') . '=.*$/m', $line, $contents, 1);
        continue;
    }

    $contents .= PHP_EOL . $line;
}

file_put_contents($path, $contents);
PHP

php artisan config:clear
php artisan migrate --force
php artisan serve --host=0.0.0.0 --port=8000
