<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PersonSearchResource extends JsonResource
{
    /**
     * @return array{id: int, person_type: string, person_type_label: string, display_name: string, status: string, status_label: string, contact_summary: string, primary_action_href: string, primary_action_label: string}
     */
    public function toArray(Request $request): array
    {
        $personType = (string) $this->resource->person_type;
        $id = (int) $this->resource->id;

        return [
            'id' => $id,
            'person_type' => $personType,
            'person_type_label' => $this->typeLabel($personType),
            'display_name' => (string) $this->resource->display_name,
            'status' => (string) $this->resource->status,
            'status_label' => $this->statusLabel((string) $this->resource->status),
            'contact_summary' => $this->contactSummary(),
            'primary_action_href' => $personType === 'visitor'
                ? "/secretaria/visitantes/{$id}/editar"
                : "/secretaria/membros/{$id}/editar",
            'primary_action_label' => 'Abrir cadastro',
        ];
    }

    private function typeLabel(string $personType): string
    {
        return $personType === 'visitor' ? 'Visitante' : 'Membro';
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'active' => 'Ativo',
            'needs_update' => 'Precisa de atualizacao',
            'inactive' => 'Inativo',
            'new' => 'Novo',
            'follow_up_needed' => 'Precisa de acompanhamento',
            'contacted' => 'Contatado',
            default => 'Situacao nao informada',
        };
    }

    private function contactSummary(): string
    {
        if ($this->resource->phone !== null && $this->resource->email !== null) {
            return 'Telefone e email informados';
        }

        if ($this->resource->phone !== null) {
            return 'Telefone informado';
        }

        if ($this->resource->email !== null) {
            return 'Email informado';
        }

        return 'Contato pendente';
    }
}
