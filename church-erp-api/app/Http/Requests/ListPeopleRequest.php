<?php

namespace App\Http\Requests;

use App\Domain\People\Models\Person;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ListPeopleRequest extends FormRequest
{
    /**
     * @var list<string>
     */
    private const ALLOWED_QUERY_FIELDS = ['q', 'person_type', 'status', 'contact', 'page', 'per_page'];

    /**
     * @var list<string>
     */
    private const BLOCKED_SCOPE_FIELDS = [
        'church_id',
        'user_id',
        'role',
        'roles',
        'permission',
        'permissions',
        'tenant',
        'tenant_id',
        'scope',
        'id',
        'email',
        'phone',
        'created_at',
        'updated_at',
        'last_contacted_at',
    ];

    /**
     * @var list<string>
     */
    private const VALID_STATUSES = [
        'active',
        'needs_update',
        'inactive',
        'new',
        'follow_up_needed',
        'contacted',
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

        return Gate::forUser($user)->allows('viewPeople', Person::class);
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'q' => is_string($this->query('q')) ? trim((string) $this->query('q')) : $this->query('q'),
            'person_type' => $this->query('person_type', 'all'),
            'status' => $this->query('status', 'all'),
            'contact' => $this->query('contact', 'all'),
            'page' => $this->query('page', 1),
            'per_page' => $this->query('per_page', 15),
        ]);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:80'],
            'person_type' => ['nullable', 'string', Rule::in(['all', 'member', 'visitor'])],
            'status' => ['nullable', 'string'],
            'contact' => ['nullable', 'string', Rule::in(['all', 'with_contact', 'missing_contact', 'phone_only', 'email_only'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'q.max' => 'Use ate 80 caracteres para a busca.',
            'person_type.in' => 'Escolha um tipo de pessoa valido.',
            'status.string' => 'Escolha uma situacao valida.',
            'contact.in' => 'Escolha um filtro de contato valido.',
            'page.integer' => 'Informe uma pagina valida.',
            'page.min' => 'Informe uma pagina valida.',
            'per_page.integer' => 'Informe uma quantidade valida por pagina.',
            'per_page.min' => 'Informe uma quantidade valida por pagina.',
            'per_page.max' => 'Use no maximo 50 pessoas por pagina.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $this->validateQueryShape($validator);
                $this->validateStatusFilter($validator);
            },
        ];
    }

    /**
     * @return array{church_id: int, q: ?string, person_type: string, statuses: list<string>, contact: string, page: int, per_page: int}
     */
    public function searchPayload(): array
    {
        $q = (string) $this->input('q', '');

        return [
            'church_id' => $this->resolveChurchId(),
            'q' => $q === '' ? null : $q,
            'person_type' => (string) $this->input('person_type', 'all'),
            'statuses' => $this->statusValues(),
            'contact' => (string) $this->input('contact', 'all'),
            'page' => (int) $this->input('page', 1),
            'per_page' => (int) $this->input('per_page', 15),
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Revise os filtros de pessoas e tente novamente.',
            'errors' => $validator->errors(),
        ], 422));
    }

    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Acesso negado para esta area.',
        ], 403));
    }

    private function validateQueryShape(Validator $validator): void
    {
        $seen = [];
        $queryString = (string) $this->server('QUERY_STRING', '');

        foreach (explode('&', $queryString) as $pair) {
            if ($pair === '') {
                continue;
            }

            [$rawName, $rawValue] = array_pad(explode('=', $pair, 2), 2, '');
            $name = rawurldecode(str_replace('+', ' ', $rawName));
            $value = rawurldecode(str_replace('+', ' ', $rawValue));

            if (
                ! in_array($name, self::ALLOWED_QUERY_FIELDS, true)
                || str_contains($name, '[')
                || str_contains($name, ']')
            ) {
                $validator->errors()->add(
                    $name,
                    in_array($name, self::BLOCKED_SCOPE_FIELDS, true)
                        ? 'Este parametro nao pode ser informado pelo navegador.'
                        : 'Este parametro nao e aceito nesta busca.',
                );

                continue;
            }

            if (isset($seen[$name])) {
                $validator->errors()->add($name, 'Informe este filtro apenas uma vez.');
            }

            if ($value === '' && $name !== 'q') {
                $validator->errors()->add($name, 'Este filtro precisa de um valor valido.');
            }

            $seen[$name] = true;
        }

        foreach (array_unique([...$this->query->keys(), ...$this->request->keys()]) as $name) {
            if (! in_array($name, self::ALLOWED_QUERY_FIELDS, true)) {
                $validator->errors()->add(
                    $name,
                    in_array($name, self::BLOCKED_SCOPE_FIELDS, true)
                        ? 'Este parametro nao pode ser informado pelo navegador.'
                        : 'Este parametro nao e aceito nesta busca.',
                );
            }
        }
    }

    private function validateStatusFilter(Validator $validator): void
    {
        $value = $this->input('status', 'all');

        if (! is_string($value)) {
            return;
        }

        if ($value === 'all') {
            return;
        }

        if ($value === '' || str_contains($value, ' ')) {
            $validator->errors()->add('status', 'Escolha uma situacao valida.');

            return;
        }

        $statuses = explode(',', $value);

        if ($statuses === [] || in_array('', $statuses, true) || count($statuses) !== count(array_unique($statuses))) {
            $validator->errors()->add('status', 'Escolha uma situacao valida.');

            return;
        }

        if (in_array('all', $statuses, true) || array_diff($statuses, self::VALID_STATUSES) !== []) {
            $validator->errors()->add('status', 'Escolha uma situacao valida.');
        }
    }

    /**
     * @return list<string>
     */
    private function statusValues(): array
    {
        $value = (string) $this->input('status', 'all');

        return $value === 'all' ? [] : explode(',', $value);
    }

    private function resolveChurchId(): int
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
}
