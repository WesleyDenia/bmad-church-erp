<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class ShowSecretaryHomeRequest extends FormRequest
{
    private const SCOPE_PARAMETERS = [
        'church_id',
        'user_id',
        'role',
        'roles',
        'permission',
        'permissions',
        'tenant',
        'tenant_id',
        'scope',
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

        return Gate::forUser($user)->allows('view-secretary-home');
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                foreach (array_unique([...$this->query->keys(), ...$this->request->keys()]) as $parameter) {
                    $validator->errors()->add(
                        $parameter,
                        in_array($parameter, self::SCOPE_PARAMETERS, true)
                            ? 'Este parametro nao pode ser informado pelo navegador.'
                            : 'Este parametro nao e aceito nesta leitura.',
                    );
                }
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
            'message' => 'Revise a leitura da secretaria e tente novamente.',
            'errors' => $validator->errors(),
        ], 422));
    }

    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Acesso negado para esta area.',
        ], 403));
    }
}
