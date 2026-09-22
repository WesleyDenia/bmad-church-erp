<?php

namespace Tests\Unit\Communications;

use App\Domain\Communications\Support\RenderCommunicationTemplateBody;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class RenderCommunicationTemplateBodyTest extends TestCase
{
    public function test_it_replaces_only_known_placeholders_and_reports_unknown_placeholders(): void
    {
        $result = (new RenderCommunicationTemplateBody)->render(
            'Ola {{nome}}. Contato: {{ contato }}. Situacao: {{status}}. Extra: {{aniversario}} {{data-nascimento}} {{nome completo}}.',
            [
                'nome' => 'Ana Visitante',
                'contato' => 'Telefone: +351999999999',
                'status' => 'Precisa de acompanhamento',
            ],
        );

        self::assertSame(
            'Ola Ana Visitante. Contato: Telefone: +351999999999. Situacao: Precisa de acompanhamento. Extra: {{aniversario}} {{data-nascimento}} {{nome completo}}.',
            $result['message_body'],
        );
        self::assertSame(['nome', 'contato', 'status'], $result['used_fields']);
        self::assertSame([
            [
                'field' => 'unknown_placeholder',
                'label' => 'Campo do modelo',
                'placeholder' => '{{aniversario}}',
                'message' => 'Revise este campo do modelo antes do handoff.',
            ],
            [
                'field' => 'unknown_placeholder',
                'label' => 'Campo do modelo',
                'placeholder' => '{{data-nascimento}}',
                'message' => 'Revise este campo do modelo antes do handoff.',
            ],
            [
                'field' => 'unknown_placeholder',
                'label' => 'Campo do modelo',
                'placeholder' => '{{nome completo}}',
                'message' => 'Revise este campo do modelo antes do handoff.',
            ],
        ], $result['missing_fields']);
    }

    public function test_it_appends_deterministic_fallback_when_template_has_no_known_placeholders(): void
    {
        $result = (new RenderCommunicationTemplateBody)->render(
            'Texto base sem campos.',
            [
                'nome' => 'Maria Silva',
                'contato' => '[contato pendente]',
                'status' => 'Ativo',
            ],
        );

        self::assertSame(
            "Texto base sem campos.\n\nDados para personalizar:\nNome: Maria Silva\nContato: [contato pendente]\nSituacao: Ativo",
            $result['message_body'],
        );
        self::assertSame([], $result['used_fields']);
    }

    public function test_it_rejects_template_and_message_body_over_the_story_limits(): void
    {
        $renderer = new RenderCommunicationTemplateBody;

        $this->expectException(ValidationException::class);
        $renderer->render(str_repeat('a', 4001), [
            'nome' => 'Maria Silva',
            'contato' => 'Email: maria@example.com',
            'status' => 'Ativo',
        ]);
    }

    public function test_it_rejects_final_message_over_the_story_limit(): void
    {
        $renderer = new RenderCommunicationTemplateBody;

        $this->expectException(ValidationException::class);
        $renderer->render(str_repeat('a', 3990).' {{nome}}', [
            'nome' => str_repeat('b', 1100),
            'contato' => 'Email: maria@example.com',
            'status' => 'Ativo',
        ]);
    }
}
