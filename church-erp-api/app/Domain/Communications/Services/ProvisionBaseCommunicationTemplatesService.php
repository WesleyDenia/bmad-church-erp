<?php

namespace App\Domain\Communications\Services;

use App\Domain\Communications\Models\CommunicationTemplate;

class ProvisionBaseCommunicationTemplatesService
{
    public function provision(): void
    {
        foreach ($this->defaults() as $template) {
            CommunicationTemplate::query()->firstOrCreate(
                [
                    'church_id' => null,
                    'template_key' => $template['template_key'],
                ],
                [
                    'name' => $template['name'],
                    'short_description' => $template['short_description'],
                    'body_template' => $template['body_template'],
                    'category' => $template['category'],
                    'suggested_channel' => 'external_handoff',
                    'status' => 'active',
                    'sort_order' => $template['sort_order'],
                ],
            );
        }
    }

    /**
     * @return list<array{template_key: string, name: string, short_description: string, body_template: string, category: string, sort_order: int}>
     */
    private function defaults(): array
    {
        return [
            [
                'template_key' => 'visitante_primeiro_contato',
                'name' => 'Primeiro contato com visitante',
                'short_description' => 'Mensagem curta para acolher um visitante recente.',
                'body_template' => 'Ola, queremos agradecer pela sua visita e dizer que foi muito bom receber voce. Seguimos a disposicao para caminhar junto.',
                'category' => 'visitor_follow_up',
                'sort_order' => 10,
            ],
            [
                'template_key' => 'atualizacao_cadastro',
                'name' => 'Atualizacao de cadastro',
                'short_description' => 'Pedido simples para confirmar dados cadastrais.',
                'body_template' => 'Ola, estamos revisando os cadastros da igreja. Quando puder, confirme se seus dados continuam atualizados.',
                'category' => 'member_update',
                'sort_order' => 20,
            ],
            [
                'template_key' => 'aviso_semanal',
                'name' => 'Aviso semanal',
                'short_description' => 'Comunicado curto para a rotina da semana.',
                'body_template' => 'Paz. Compartilhamos os avisos da semana para ajudar a comunidade a acompanhar a rotina da igreja.',
                'category' => 'weekly_notice',
                'sort_order' => 30,
            ],
            [
                'template_key' => 'lembrete_evento',
                'name' => 'Lembrete de evento',
                'short_description' => 'Lembrete pastoral para uma programacao proxima.',
                'body_template' => 'Paz. Passamos para lembrar da proxima programacao da igreja e reforcar que sua presenca sera bem-vinda.',
                'category' => 'event_reminder',
                'sort_order' => 40,
            ],
        ];
    }
}
