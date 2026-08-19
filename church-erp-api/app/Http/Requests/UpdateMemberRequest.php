<?php

namespace App\Http\Requests;

use App\Domain\People\Models\Person;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class UpdateMemberRequest extends FormRequest
{
    /**
     * @var list<string>
     */
    private const ALLOWED_FIELDS = ['display_name', 'status', 'phone', 'email'];

    private ?Person $resolvedMember = null;

    public function authorize(): bool
    {
        $user = $this->user();

        if ($user === null) {
            throw new HttpResponseException(response()->json([
                'message' => 'Sessao invalida. Entre novamente.',
            ], 401));
        }

        if (! Gate::forUser($user)->allows('updateMember', Person::class)) {
            return false;
        }

        $this->member();

        return true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'display_name' => ['sometimes', 'required', 'string', 'max:160'],
            'status' => ['sometimes', 'required', 'string', Rule::in(['active', 'inactive', 'needs_update'])],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'email' => ['sometimes', 'nullable', 'email', 'max:160'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'display_name.required' => 'Informe o nome do membro.',
            'display_name.max' => 'Use ate 160 caracteres para o nome do membro.',
            'status.required' => 'Escolha uma situacao valida para o membro.',
            'status.in' => 'Escolha uma situacao valida para o membro.',
            'phone.max' => 'Use ate 40 caracteres para o telefone.',
            'email.email' => 'Informe um email valido.',
            'email.max' => 'Use ate 160 caracteres para o email.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $extraFields = array_values(array_diff(array_keys($this->all()), self::ALLOWED_FIELDS));
                $extraQuery = array_keys($this->query->all());

                if ($extraFields !== [] || $extraQuery !== []) {
                    $validator->errors()->add('payload', 'Envie apenas os campos permitidos do membro.');
                }

                if ($this->all() === []) {
                    $validator->errors()->add('payload', 'Informe ao menos um campo do membro.');
                }
            },
        ];
    }

    /**
     * @return array{church_id: int, display_name?: string, status?: string, phone?: ?string, email?: ?string}
     */
    public function memberPayload(): array
    {
        $payload = [
            'church_id' => $this->churchId(),
        ];

        if ($this->has('display_name')) {
            $payload['display_name'] = (string) $this->string('display_name');
        }

        if ($this->has('status')) {
            $payload['status'] = (string) $this->string('status');
        }

        if ($this->has('phone')) {
            $payload['phone'] = $this->nullableTrimmedString('phone');
        }

        if ($this->has('email')) {
            $payload['email'] = $this->nullableLowerEmail();
        }

        return $payload;
    }

    public function member(): Person
    {
        if ($this->resolvedMember !== null) {
            return $this->resolvedMember;
        }

        $personId = $this->route('person');

        if (! is_scalar($personId)) {
            throw new HttpResponseException(response()->json([
                'message' => 'Membro nao encontrado.',
            ], 404));
        }

        $member = Person::query()
            ->forChurch($this->churchId())
            ->where('person_type', 'member')
            ->find((int) $personId);

        if ($member === null) {
            throw new HttpResponseException(response()->json([
                'message' => 'Membro nao encontrado.',
            ], 404));
        }

        $this->resolvedMember = $member;

        return $this->resolvedMember;
    }

    protected function failedValidation(Validator $validator): void
    {
        $message = $validator->errors()->has('payload')
            ? 'Envie apenas os campos permitidos do membro.'
            : 'Revise os campos do membro e tente novamente.';

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

    private function nullableTrimmedString(string $key): ?string
    {
        $value = $this->input($key);

        if ($value === null) {
            return null;
        }

        $trimmed = trim((string) $value);

        return $trimmed === '' ? null : $trimmed;
    }

    private function nullableLowerEmail(): ?string
    {
        $email = $this->nullableTrimmedString('email');

        return $email === null ? null : strtolower($email);
    }

    private function churchId(): int
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
