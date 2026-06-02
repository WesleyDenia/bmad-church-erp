<?php

namespace App\Http\Requests;

use App\Domain\Identity\Models\ChurchUser;
use App\Domain\Identity\Services\CreateChurchUserService;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StoreChurchUserRequest extends FormRequest
{
    /**
     * @var list<string>
     */
    private const ALLOWED_FIELDS = [
        'name',
        'email',
        'password',
        'password_confirmation',
        'role',
    ];

    public function authorize(): bool
    {
        $user = $this->user();

        if ($user === null) {
            throw new HttpResponseException(response()->json([
                'message' => 'Sessao invalida. Entre novamente.',
            ], 401));
        }

        return Gate::forUser($user)->allows('create', ChurchUser::class);
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['required', 'string', Rule::in(CreateChurchUserService::ALLOWED_ROLES)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Informe o nome da pessoa usuaria.',
            'name.max' => 'Use um nome com ate 160 caracteres.',
            'email.required' => 'Informe o email da pessoa usuaria.',
            'email.email' => 'Informe um email valido.',
            'password.required' => 'Informe uma senha.',
            'password.min' => 'Use uma senha com pelo menos 8 caracteres.',
            'password.confirmed' => 'A confirmacao da senha precisa ser igual a senha.',
            'role.required' => 'Selecione um perfil basico valido.',
            'role.in' => 'Selecione um perfil basico valido.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $extraFields = array_values(array_diff(array_keys($this->all()), self::ALLOWED_FIELDS));

                if ($extraFields !== []) {
                    $validator->errors()->add('payload', 'Envie apenas nome, email, senha e perfil.');
                }
            },
        ];
    }

    /**
     * @return array{church_id: int, name: string, email: string, password: string, role: string}
     */
    public function churchUserPayload(): array
    {
        return [
            'church_id' => $this->resolveChurchId(),
            'name' => trim((string) $this->string('name')),
            'email' => trim(mb_strtolower((string) $this->string('email'))),
            'password' => (string) $this->input('password'),
            'role' => (string) $this->string('role'),
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        $message = $validator->errors()->has('payload')
            ? 'Envie apenas nome, email, senha e perfil.'
            : 'Revise os campos obrigatorios e tente novamente.';

        throw new HttpResponseException(response()->json([
            'message' => $message,
            'errors' => $validator->errors(),
        ], 422));
    }

    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Acesso negado para esta area.',
        ], 403));
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
