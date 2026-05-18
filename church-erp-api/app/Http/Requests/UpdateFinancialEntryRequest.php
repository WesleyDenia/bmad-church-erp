<?php

namespace App\Http\Requests;

use App\Domain\Finance\Models\FinancialCategory;
use App\Domain\Finance\Models\FinancialEntry;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class UpdateFinancialEntryRequest extends FormRequest
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
        'reason',
        'resolve_pending_review',
    ];

    private ?FinancialEntry $resolvedEntry = null;

    public function authorize(): bool
    {
        $user = $this->user();

        if ($user === null) {
            throw new HttpResponseException(response()->json([
                'message' => 'Sessao invalida. Entre novamente.',
            ], 401));
        }

        $entry = $this->entry();

        if ($entry === null) {
            throw new HttpResponseException(response()->json([
                'message' => 'Lancamento nao encontrado.',
            ], 404));
        }

        Gate::forUser($user)->authorize('update', $entry);

        return true;
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
            'reason' => ['required', 'string', 'max:255'],
            'resolve_pending_review' => ['sometimes', 'boolean'],
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
            'reason.required' => 'Informe o motivo da alteracao financeira.',
            'reason.max' => 'Use ate 255 caracteres para o motivo da alteracao.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $extraFields = array_values(array_diff(array_keys($this->all()), self::ALLOWED_FIELDS));

                if ($extraFields !== []) {
                    $validator->errors()->add('payload', 'Envie apenas os campos da edicao financeira.');
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
     * @return array{church_id: int, entry_type: string, amount: string, financial_category_id: int, counterparty_id: int, cost_center_name: string, reason: string, resolve_pending_review: bool, ip_address: string|null}
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
            'reason' => trim((string) $this->string('reason')),
            'resolve_pending_review' => $this->boolean('resolve_pending_review'),
            'ip_address' => $this->ip(),
        ];
    }

    public function entry(): ?FinancialEntry
    {
        if ($this->resolvedEntry !== null) {
            return $this->resolvedEntry;
        }

        $entryId = $this->route('entry');

        if (! is_scalar($entryId)) {
            return null;
        }

        /** @var FinancialEntry|null $entry */
        $entry = FinancialEntry::query()
            ->withoutGlobalScopes()
            ->with(['financialCategory', 'counterparty'])
            ->find((int) $entryId);

        $this->resolvedEntry = $entry;

        return $this->resolvedEntry;
    }

    protected function failedValidation(Validator $validator): void
    {
        $message = $validator->errors()->has('payload')
            ? 'Envie apenas os campos da edicao financeira.'
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
