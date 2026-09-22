<?php

namespace App\Http\Resources;

use App\Domain\Communications\Models\CommunicationTemplate;
use App\Domain\People\Models\Person;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommunicationMessageDraftResource extends JsonResource
{
    /**
     * @return array{template: array<string, string>, person: array{id: int, person_type: string, display_name: string, status: string, status_label: string, contact_summary: string}, draft: array{message_body: string, missing_fields: list<array<string, string>>, used_fields: list<string>, editable: bool}}
     */
    public function toArray(Request $request): array
    {
        /** @var array{template: CommunicationTemplate, person: Person, contact_summary: string, status_label: string, draft: array{message_body: string, missing_fields: list<array<string, string>>, used_fields: list<string>, editable: bool}} $resource */
        $resource = $this->resource;
        $template = $resource['template'];
        $person = $resource['person'];

        return [
            'template' => [
                'template_key' => (string) $template->template_key,
                'name' => (string) $template->name,
                'category' => (string) $template->category,
                'suggested_channel' => (string) $template->suggested_channel,
            ],
            'person' => [
                'id' => (int) $person->id,
                'person_type' => (string) $person->person_type,
                'display_name' => (string) $person->display_name,
                'status' => (string) $person->status,
                'status_label' => $resource['status_label'],
                'contact_summary' => $resource['contact_summary'],
            ],
            'draft' => $resource['draft'],
        ];
    }
}
