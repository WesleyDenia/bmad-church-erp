<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Settings\Services\ResolveOnboardingTermsService;
use App\Http\Resources\OnboardingTermsResource;

class ShowOnboardingTermsController
{
    public function __invoke(ResolveOnboardingTermsService $service): OnboardingTermsResource
    {
        return new OnboardingTermsResource($service->current());
    }
}
