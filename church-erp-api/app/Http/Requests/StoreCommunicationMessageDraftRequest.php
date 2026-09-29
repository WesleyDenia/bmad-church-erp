<?php

namespace App\Http\Requests;

use App\Domain\Communications\Models\CommunicationTemplate;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StoreCommunicationMessageDraftRequest extends FormRequest
{
    private const TEMPLATE_KEY_PATTERN = '/\A[a-z0-9_:-]{1,80}\z/';

    /**
     * @var list<string>
     */
    private const ALLOWED_FIELDS = [
        'template_key',
        'person_type',
        'person_id',
    ];

    /**
     * @var list<string>
     */
    private const BLOCKED_FIELDS = [
        'church_id',
        'tenant',
        'scope',
        'role',
        'roles',
        'permission',
        'user_id',
        'id',
        'template_id',
        'person',
        'status',
        'phone',
        'email',
        'body_template',
        'message_body',
        'created_at',
        'updated_at',
    ];

    public function authorize(): bool
    {
        $user = $this->user();
        $session = $this->attributes->get('authenticated_session');

        if ($user === null || ! is_array($session) || ! isset($session['membership'])) {
            $this->logAttempt('unauthenticated');

            throw new HttpResponseException(response()->json([
                'message' => 'Sessao invalida. Entre novamente.',
            ], 401));
        }

        return Gate::forUser($user)->allows('prepareCommunicationMessageDraft', CommunicationTemplate::class);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'template_key' => ['required', 'string', 'max:80', 'regex:'.self::TEMPLATE_KEY_PATTERN],
            'person_type' => ['required', 'string', Rule::in(['member', 'visitor'])],
            'person_id' => ['required', 'integer', 'min:1', 'max:9007199254740991'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $this->validateJsonRequest($validator);
                $this->validateQueryIsEmpty($validator);
                $this->validateRootPayloadAllowlist($validator);
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

    /**
     * @return array{template_key: string, person_type: string, person_id: int}
     */
    public function draftPayload(): array
    {
        $validated = $this->validated();

        return [
            'template_key' => (string) $validated['template_key'],
            'person_type' => (string) $validated['person_type'],
            'person_id' => (int) $validated['person_id'],
        ];
    }

    public function correlationId(): string
    {
        $requestId = $this->headers->get('X-Request-ID');

        if (is_string($requestId) && preg_match('/\A[A-Za-z0-9._:-]{1,64}\z/', $requestId) === 1) {
            return $requestId;
        }

        return (string) Str::uuid();
    }

    protected function failedValidation(Validator $validator): void
    {
        $this->logAttempt('validation_failed');

        throw new HttpResponseException(response()->json([
            'message' => 'Revise os dados para preparar a mensagem.',
            'errors' => $validator->errors(),
        ], 422));
    }

    protected function failedAuthorization(): void
    {
        $this->logAttempt('forbidden');

        throw new HttpResponseException(response()->json([
            'message' => 'Acesso negado para esta area.',
        ], 403));
    }

    private function validateJsonRequest(Validator $validator): void
    {
        if (! $this->isJson()) {
            $validator->errors()->add('content_type', 'Envie os dados em JSON.');

            return;
        }

        $content = trim($this->getContent());

        if ($content === '') {
            $validator->errors()->add('payload', 'Informe os dados para preparar a mensagem.');

            return;
        }

        try {
            $decoded = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            $validator->errors()->add('payload', 'Informe um JSON valido.');

            return;
        }

        if (! is_array($decoded) || array_is_list($decoded) || $decoded === []) {
            $validator->errors()->add('payload', 'Informe um objeto JSON com os campos permitidos.');
        }
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
                in_array($name, [...self::BLOCKED_FIELDS, 'person_id'], true)
                    ? 'Este parametro nao pode ser informado pelo navegador.'
                    : 'Esta rota nao aceita parametros.',
            );
        }
    }

    private function validateRootPayloadAllowlist(Validator $validator): void
    {
        foreach ($this->request->keys() as $name) {
            if (in_array((string) $name, self::ALLOWED_FIELDS, true)) {
                continue;
            }

            $validator->errors()->add(
                (string) $name,
                in_array((string) $name, self::BLOCKED_FIELDS, true)
                    ? 'Este campo nao pode ser informado pelo navegador.'
                    : 'Este campo nao e aceito para preparar a mensagem.',
            );
        }
    }

    private function logAttempt(string $outcome): void
    {
        $session = $this->attributes->get('authenticated_session');
        $membership = is_array($session) ? ($session['membership'] ?? null) : null;
        $payload = $this->safeJsonPayload();

        Log::info('communication_message_draft_attempted', [
            'actor_user_id' => $this->user()?->id,
            'church_id' => is_object($membership) ? ($membership->church_id ?? null) : null,
            'person_type' => $this->safeString($payload['person_type'] ?? null, 20),
            'person_id' => $this->safePositiveInt($payload['person_id'] ?? null),
            'template_key' => $this->safeTemplateKey($payload['template_key'] ?? null),
            'outcome' => $outcome,
            'timestamp' => Carbon::now('UTC')->toISOString(),
            'correlation_id' => $this->correlationId(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function safeJsonPayload(): array
    {
        try {
            $decoded = json_decode($this->getContent(), true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return [];
        }

        return is_array($decoded) && ! array_is_list($decoded) ? $decoded : [];
    }

    private function safeString(mixed $value, int $maxLength): ?string
    {
        return is_string($value) ? mb_substr($value, 0, $maxLength) : null;
    }

    private function safeTemplateKey(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        return preg_match(self::TEMPLATE_KEY_PATTERN, $value) === 1
            ? $value
            : 'invalid_template_key';
    }

    private function safePositiveInt(mixed $value): ?int
    {
        return is_int($value) && $value > 0 ? $value : null;
    }
}
