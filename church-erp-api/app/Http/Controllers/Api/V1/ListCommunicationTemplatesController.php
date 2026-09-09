<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Communications\Services\ListCommunicationTemplatesService;
use App\Http\Requests\ListCommunicationTemplatesRequest;
use App\Http\Resources\CommunicationTemplateResource;

class ListCommunicationTemplatesController
{
    public function __invoke(ListCommunicationTemplatesRequest $request, ListCommunicationTemplatesService $service): mixed
    {
        $templates = $service->list($request->churchId());

        return CommunicationTemplateResource::collection($templates);
    }
}
