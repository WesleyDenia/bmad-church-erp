<?php

namespace App\Http\Requests;

use App\Domain\Finance\Models\FinancialCounterparty;
use App\Domain\Finance\Support\FinancialCounterpartyNameNormalizer;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class StoreFinancialCounterpartyRequest extends FormRequest
{
    /**
     * @var list<string>
     */
    private const ALLOWED_FIELDS = ['name'];

    public function authorize(): bool
    {
        $user = $this->user();

        if ($user === null) {
            throw new HttpResponseException(response()->json([
                'message' => 'Sessao invalida. Entre novamente.',
            ], 401));
        }

        return Gate::forUser($user)->allows('access-backoffice-area', 'treasury');
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Informe o nome da contraparte.',
            'name.max' => 'Use ate 160 caracteres para a contraparte.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $extraFields = array_values(array_diff(array_keys($this->all()), self::ALLOWED_FIELDS));

                if ($extraFields !== []) {
                    $validator->errors()->add('payload', 'Envie apenas o nome da contraparte.');
                }

                $name = (string) $this->string('name');

                if ($name === '') {
                    return;
                }

                $slug = FinancialCounterpartyNameNormalizer::slug($name);

                if ($slug === '') {
                    $validator->errors()->add('name', 'Informe um nome valido para a contraparte.');

                    return;
                }

                if (FinancialCounterparty::query()->where('slug', $slug)->exists()) {
                    $validator->errors()->add('name', 'Ja existe uma contraparte com esse nome nesta igreja.');
                }
            },
        ];
    }

    /**
     * @return array{church_id: int, name: string}
     */
    public function counterpartyPayload(): array
    {
        return [
            'church_id' => $this->resolveChurchId(),
            'name' => (string) $this->string('name'),
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        $message = $validator->errors()->has('payload')
            ? 'Envie apenas o nome da contraparte.'
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
