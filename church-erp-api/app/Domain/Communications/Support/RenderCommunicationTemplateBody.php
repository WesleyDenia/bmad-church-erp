<?php

namespace App\Domain\Communications\Support;

use Illuminate\Validation\ValidationException;

class RenderCommunicationTemplateBody
{
    private const BODY_TEMPLATE_MAX_LENGTH = 4000;

    private const MESSAGE_BODY_MAX_LENGTH = 5000;

    /**
     * @param  array{nome: string, contato: string, status: string}  $values
     * @return array{message_body: string, used_fields: list<string>, missing_fields: list<array<string, string>>}
     */
    public function render(string $bodyTemplate, array $values): array
    {
        if (mb_strlen($bodyTemplate) > self::BODY_TEMPLATE_MAX_LENGTH) {
            throw ValidationException::withMessages([
                'template_key' => 'Modelo indisponivel para preparacao.',
            ]);
        }

        $usedFields = [];
        $knownPlaceholders = [
            'nome' => $values['nome'],
            'contato' => $values['contato'],
            'status' => $values['status'],
        ];
        $messageBody = $bodyTemplate;

        foreach ($knownPlaceholders as $field => $replacement) {
            $pattern = '/{{\s*'.preg_quote($field, '/').'\s*}}/';

            if (preg_match($pattern, $messageBody) === 1) {
                $usedFields[] = $field;
                $messageBody = preg_replace($pattern, $replacement, $messageBody) ?? $messageBody;
            }
        }

        $missingFields = $this->unknownPlaceholders($messageBody);

        if ($usedFields === []) {
            $messageBody .= "\n\nDados para personalizar:\nNome: {$values['nome']}\nContato: {$values['contato']}\nSituacao: {$values['status']}";
        }

        if (mb_strlen($messageBody) > self::MESSAGE_BODY_MAX_LENGTH) {
            throw ValidationException::withMessages([
                'template_key' => 'Modelo indisponivel para preparacao.',
            ]);
        }

        return [
            'message_body' => $messageBody,
            'used_fields' => $usedFields,
            'missing_fields' => $missingFields,
        ];
    }

    /**
     * @return list<array{field: string, label: string, placeholder: string, message: string}>
     */
    private function unknownPlaceholders(string $messageBody): array
    {
        preg_match_all('/{{\s*([^{}]+?)\s*}}/u', $messageBody, $matches);

        $missing = [];

        foreach ($matches[0] as $index => $placeholder) {
            $field = $matches[1][$index] ?? '';

            if (in_array($field, ['nome', 'contato', 'status'], true)) {
                continue;
            }

            $missing[$placeholder] = [
                'field' => 'unknown_placeholder',
                'label' => 'Campo do modelo',
                'placeholder' => $placeholder,
                'message' => 'Revise este campo do modelo antes do handoff.',
            ];
        }

        return array_values($missing);
    }
}
