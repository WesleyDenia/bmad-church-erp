<?php

namespace App\Http\Requests;

use App\Domain\Communications\Models\CommunicationTemplate;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class ListCommunicationTemplatesRequest extends FormRequest
{
    /**
     * @var list<string>
     */
    private const BLOCKED_QUERY_FIELDS = [
        'church_id',
        'tenant',
        'scope',
        'role',
        'roles',
        'permission',
        'user_id',
        'id',
        'template_id',
        'status',
        'created_at',
        'updated_at',
    ];

    public function authorize(): bool
    {
        $user = $this->user();
        $session = $this->attributes->get('authenticated_session');

        if ($user === null || ! is_array($session) || ! isset($session['membership'])) {
            throw new HttpResponseException(response()->json([
                'message' => 'Sessao invalida. Entre novamente.',
            ], 401));
        }

        return Gate::forUser($user)->allows('viewCommunicationTemplates', CommunicationTemplate::class);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $this->validateQueryIsEmpty($validator);
            },
        ];
    }

    public function churchId(): int
    {
        $session = $this->attributes->get('authenticated_session');
        $membership = is_array($session) ? ($session['membership'] ?? null) : null;
        $churchId = is_object($membership) ? ($membership->church_id ?? null) : null;

        if (! is_int($churchId)) {
            throw ValidationException::withMessages([
                'session' => 'Sessao invalida. Entre novamente.',
            ]);
        }

        return $churchId;
    }

    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Revise a leitura dos modelos de comunicacao e tente novamente.',
            'errors' => $validator->errors(),
        ], 422));
    }

    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Acesso negado para esta area.',
        ], 403));
    }

    private function validateQueryIsEmpty(Validator $validator): void
    {
        $queryString = (string) $this->server('QUERY_STRING', '');

        foreach (explode('&', $queryString) as $pair) {
            if ($pair === '') {
                continue;
            }

            [$rawName] = array_pad(explode('=', $pair, 2), 2, '');
            $name = rawurldecode(str_replace('+', ' ', $rawName));
            $validator->errors()->add(
                $name,
                in_array($name, self::BLOCKED_QUERY_FIELDS, true)
                    ? 'Este parametro nao pode ser informado pelo navegador.'
                    : 'Esta leitura nao aceita parametros.',
            );
        }

        foreach (array_unique([...$this->query->keys(), ...$this->request->keys()]) as $name) {
            $validator->errors()->add(
                (string) $name,
                in_array((string) $name, self::BLOCKED_QUERY_FIELDS, true)
                    ? 'Este parametro nao pode ser informado pelo navegador.'
                    : 'Esta leitura nao aceita parametros.',
            );
        }
    }
}
