<?php

namespace App\Domain\Finance\Support;

use Illuminate\Support\Str;

class FinancialCounterpartyNameNormalizer
{
    public static function displayName(string $name): string
    {
        $trimmed = trim($name);

        return preg_replace('/\s+/u', ' ', $trimmed) ?? $trimmed;
    }

    public static function slug(string $name): string
    {
        return Str::slug(self::displayName($name));
    }
}
