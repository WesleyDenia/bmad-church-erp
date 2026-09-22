<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Communications\Services\PrepareCommunicationMessageDraftService;
use App\Http\Requests\StoreCommunicationMessageDraftRequest;
use App\Http\Resources\CommunicationMessageDraftResource;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class StoreCommunicationMessageDraftController
{
    public function __invoke(StoreCommunicationMessageDraftRequest $request, PrepareCommunicationMessageDraftService $service): CommunicationMessageDraftResource
    {
        try {
            $draft = $service->prepare(
                $request->churchId(),
                $request->user(),
                $request->draftPayload(),
                $request->correlationId(),
            );
        } catch (NotFoundHttpException) {
            throw new NotFoundHttpException('Nao foi possivel preparar esta mensagem.');
        }

        return new CommunicationMessageDraftResource($draft);
    }
}
