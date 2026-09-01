<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\People\Services\ListPeopleService;
use App\Http\Requests\ListPeopleRequest;
use App\Http\Resources\PersonSearchResource;

class ListPeopleController
{
    public function __invoke(ListPeopleRequest $request, ListPeopleService $service): mixed
    {
        $paginator = $service->list($request->searchPayload());

        return PersonSearchResource::collection($paginator);
    }
}
