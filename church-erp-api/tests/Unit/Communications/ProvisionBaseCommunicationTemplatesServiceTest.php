<?php

namespace Tests\Unit\Communications;

use App\Domain\Communications\Models\CommunicationTemplate;
use App\Domain\Communications\Services\ProvisionBaseCommunicationTemplatesService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProvisionBaseCommunicationTemplatesServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_provision_is_idempotent_and_keeps_existing_base_content(): void
    {
        $service = $this->app->make(ProvisionBaseCommunicationTemplatesService::class);

        $service->provision();
        CommunicationTemplate::query()
            ->whereNull('church_id')
            ->where('template_key', 'aviso_semanal')
            ->update(['name' => 'Aviso localmente revisado']);
        CommunicationTemplate::query()
            ->whereNull('church_id')
            ->where('template_key', 'lembrete_evento')
            ->delete();
        $service->provision();

        self::assertSame(4, CommunicationTemplate::query()->whereNull('church_id')->count());
        self::assertSame(
            'Aviso localmente revisado',
            CommunicationTemplate::query()
                ->whereNull('church_id')
                ->where('template_key', 'aviso_semanal')
                ->value('name'),
        );
        self::assertSame(
            1,
            CommunicationTemplate::query()
                ->whereNull('church_id')
                ->where('template_key', 'lembrete_evento')
                ->count(),
        );
    }

    public function test_base_templates_have_body_templates_but_no_personal_data_or_tenant_scope(): void
    {
        $this->app->make(ProvisionBaseCommunicationTemplatesService::class)->provision();

        $templates = CommunicationTemplate::query()->orderBy('sort_order')->get();

        self::assertSame(
            ['visitante_primeiro_contato', 'atualizacao_cadastro', 'aviso_semanal', 'lembrete_evento'],
            $templates->pluck('template_key')->all(),
        );
        self::assertTrue($templates->every(fn (CommunicationTemplate $template): bool => $template->church_id === null));
        self::assertTrue($templates->every(fn (CommunicationTemplate $template): bool => $template->church_scope_id === 0));
        self::assertTrue($templates->every(fn (CommunicationTemplate $template): bool => is_string($template->body_template) && $template->body_template !== ''));
        self::assertFalse($templates->contains(fn (CommunicationTemplate $template): bool => str_contains($template->body_template, '@')));
        self::assertFalse($templates->contains(fn (CommunicationTemplate $template): bool => preg_match('/\b\d{8,}\b/', $template->body_template) === 1));
    }
}
