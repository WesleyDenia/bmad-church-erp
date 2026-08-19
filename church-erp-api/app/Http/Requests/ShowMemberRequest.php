<?php

namespace App\Http\Requests;

use App\Domain\People\Models\Person;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class ShowMemberRequest extends FormRequest
{
    private ?Person $resolvedMember = null;

    public function authorize(): bool
    {
        $user = $this->user();

        if ($user === null) {
            throw new HttpResponseException(response()->json([
                'message' => 'Sessao invalida. Entre novamente.',
            ], 401));
        }

        return Gate::forUser($user)->allows('viewMember', Person::class);
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
        throw new HttpResponseException(response()->json([
            'message' => 'Revise a leitura do membro e tente novamente.',
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
        $this->member();
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
