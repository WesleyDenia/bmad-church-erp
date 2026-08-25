<?php

namespace App\Http\Requests;

use App\Domain\People\Models\Person;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class ShowVisitorRequest extends FormRequest
{
    private ?Person $resolvedVisitor = null;

    public function authorize(): bool
    {
        $user = $this->user();

        if ($user === null) {
            throw new HttpResponseException(response()->json([
                'message' => 'Sessao invalida. Entre novamente.',
            ], 401));
        }

        return Gate::forUser($user)->allows('viewVisitor', Person::class);
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
                foreach ($this->query->keys() as $parameter) {
                    $validator->errors()->add($parameter, 'Este parametro nao e aceito nesta leitura.');
                }
            },
        ];
    }

    public function visitor(): Person
    {
        if ($this->resolvedVisitor !== null) {
            return $this->resolvedVisitor;
        }

        $personId = $this->route('person');

        if (! is_scalar($personId)) {
            throw new HttpResponseException(response()->json([
                'message' => 'Visitante nao encontrado.',
            ], 404));
        }

        $visitor = Person::query()
            ->forChurch($this->churchId())
            ->where('person_type', 'visitor')
            ->find((int) $personId);

        if ($visitor === null) {
            throw new HttpResponseException(response()->json([
                'message' => 'Visitante nao encontrado.',
            ], 404));
        }

        $this->resolvedVisitor = $visitor;

        return $this->resolvedVisitor;
    }

    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Revise a leitura do visitante e tente novamente.',
            'errors' => $validator->errors(),
        ], 422));
    }

    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Acesso negado para esta area.',
        ], 403));
    }

    protected function passedValidation(): void
    {
        $this->visitor();
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
