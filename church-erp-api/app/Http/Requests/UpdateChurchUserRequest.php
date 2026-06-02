<?php

namespace App\Http\Requests;

use App\Domain\Identity\Models\ChurchUser;
use App\Domain\Identity\Services\CreateChurchUserService;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class UpdateChurchUserRequest extends FormRequest
{
    /**
     * @var list<string>
     */
    private const ALLOWED_FIELDS = ['role', 'status'];

    public function authorize(): bool
    {
        $user = $this->user();

        if ($user === null) {
            throw new HttpResponseException(response()->json([
                'message' => 'Sessao invalida. Entre novamente.',
            ], 401));
        }

        return Gate::forUser($user)->allows('viewAny', ChurchUser::class);
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'role' => ['sometimes', 'required', 'string', Rule::in(CreateChurchUserService::ALLOWED_ROLES)],
            'status' => ['sometimes', 'required', 'string', Rule::in(['active', 'inactive'])],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'role.required' => 'Selecione um perfil basico valido.',
            'role.in' => 'Selecione um perfil basico valido.',
            'status.required' => 'Selecione um status valido.',
            'status.in' => 'Selecione um status valido.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $fields = array_keys($this->all());
                $extraFields = array_values(array_diff($fields, self::ALLOWED_FIELDS));

                if ($extraFields !== []) {
                    $validator->errors()->add('payload', 'Envie apenas perfil e/ou status para atualizar.');
                }

                if ($fields === [] || (! $this->has('role') && ! $this->has('status'))) {
                    $validator->errors()->add('payload', 'Informe pelo menos perfil ou status para atualizar.');
                }
            },
        ];
    }

    /**
     * @return array{role?: string, status?: string}
     */
    public function membershipPayload(): array
    {
        $payload = [];

        if ($this->has('role')) {
            $payload['role'] = (string) $this->string('role');
        }

        if ($this->has('status')) {
            $payload['status'] = (string) $this->string('status');
        }

        return $payload;
    }

    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Acesso negado para esta area.',
        ], 403));
    }

    protected function failedValidation(Validator $validator): void
    {
        $message = $validator->errors()->has('payload')
            ? $validator->errors()->first('payload')
            : 'Revise os campos obrigatorios e tente novamente.';

        throw new HttpResponseException(response()->json([
            'message' => $message,
            'errors' => $validator->errors(),
        ], 422));
    }
}
