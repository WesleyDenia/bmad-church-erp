<?php

namespace App\Http\Requests;

use App\Domain\Finance\Models\FinancialCategory;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StoreFinancialEntryRequest extends FormRequest
{
    /**
     * @var list<string>
     */
    private const ALLOWED_FIELDS = [
        'entry_type',
        'amount',
        'financial_category_id',
        'counterparty_id',
        'cost_center_name',
    ];

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
        $churchId = $this->resolveChurchId();

        return [
            'entry_type' => ['required', 'string', Rule::in(['income', 'expense'])],
            'amount' => ['required', 'string', 'regex:/^\d+(?:\.\d{1,2})?$/'],
            'financial_category_id' => [
                'required',
                'integer',
                Rule::exists('financial_categories', 'id')->where(
                    static fn ($query) => $query->where('church_id', $churchId)
                ),
            ],
            'counterparty_id' => [
                'required',
                'integer',
                Rule::exists('financial_counterparties', 'id')->where(
                    static fn ($query) => $query->where('church_id', $churchId)
                ),
            ],
            'cost_center_name' => ['required', 'string', 'max:160'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'entry_type.required' => 'Escolha se o lancamento e receita ou despesa.',
            'entry_type.in' => 'Escolha um tipo valido para o lancamento.',
            'amount.required' => 'Informe o valor do lancamento.',
            'amount.regex' => 'Informe o valor no formato 125.40.',
            'financial_category_id.required' => 'Escolha o subtipo do lancamento.',
            'financial_category_id.integer' => 'Escolha um subtipo valido para o lancamento.',
            'financial_category_id.exists' => 'Escolha uma categoria financeira valida da igreja atual.',
            'counterparty_id.required' => 'Escolha a contraparte deste lancamento.',
            'counterparty_id.integer' => 'Escolha uma contraparte valida para este lancamento.',
            'counterparty_id.exists' => 'Escolha uma contraparte valida da igreja atual.',
            'cost_center_name.required' => 'Informe o centro de custo deste lancamento.',
            'cost_center_name.max' => 'Use ate 160 caracteres para o centro de custo.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $extraFields = array_values(array_diff(array_keys($this->all()), self::ALLOWED_FIELDS));

                if ($extraFields !== []) {
                    $validator->errors()->add('payload', 'Envie apenas os campos do lancamento rapido.');
                }

                $categoryId = $this->input('financial_category_id');
                $entryType = $this->input('entry_type');

                if (! is_int($categoryId) && ! ctype_digit((string) $categoryId)) {
                    return;
                }

                if (! is_string($entryType) || $entryType === '') {
                    return;
                }

                $category = FinancialCategory::query()->find((int) $categoryId);

                if ($category === null) {
                    return;
                }

                if ($category->kind !== $entryType) {
                    $validator->errors()->add(
                        'financial_category_id',
                        'Escolha um subtipo compativel com o tipo informado.'
                    );
                }
            },
        ];
    }

    /**
     * @return array{church_id: int, entry_type: string, amount: string, financial_category_id: int, counterparty_id: int, cost_center_name: string}
     */
    public function entryPayload(): array
    {
        return [
            'church_id' => $this->resolveChurchId(),
            'entry_type' => (string) $this->string('entry_type'),
            'amount' => (string) $this->string('amount'),
            'financial_category_id' => (int) $this->integer('financial_category_id'),
            'counterparty_id' => (int) $this->integer('counterparty_id'),
            'cost_center_name' => (string) $this->string('cost_center_name'),
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        $message = $validator->errors()->has('payload')
            ? 'Envie apenas os campos do lancamento rapido.'
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
