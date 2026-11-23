<?php

namespace App\Domain\Settings\Services;

use App\Domain\Settings\Models\Term;

class ResolveOnboardingTermsService
{
    public function current(): Term
    {
        return Term::query()
            ->where('published_at', '<=', now())
            ->orderByDesc('version')
            ->firstOrFail();
    }
}
