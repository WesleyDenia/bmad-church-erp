<?php

namespace App\Domain\Settings\Services;

use App\Domain\Settings\Models\Term;
use App\Domain\Settings\Models\TermsAcceptance;
use App\Models\User;

class RecordTermsAcceptanceService
{
    public function record(User $user, Term $terms): TermsAcceptance
    {
        return TermsAcceptance::query()->firstOrCreate(
            [
                'user_id' => $user->id,
                'term_id' => $terms->id,
            ],
            [
                'terms_content_hash' => $terms->content_hash,
                'accepted_at' => now(),
            ],
        );
    }
}
