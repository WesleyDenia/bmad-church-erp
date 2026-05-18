<?php

namespace App\Http\Resources;

use App\Domain\Finance\Models\FinancialEntryAudit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FinancialEntryAuditListResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array{audits: list<FinancialEntryAudit>} $resource */
        $resource = $this->resource;

        return [
            'audits' => array_map(
                static fn (FinancialEntryAudit $audit): array => (new FinancialEntryAuditResource($audit))->toArray($request),
                $resource['audits'],
            ),
        ];
    }
}
