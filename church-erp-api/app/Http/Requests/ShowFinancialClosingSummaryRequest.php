<?php

namespace App\Http\Requests;

use App\Domain\Finance\Support\ClosingSummaryPeriod;
use App\Domain\Finance\Support\ResolveClosingSummaryPeriod;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class ShowFinancialClosingSummaryRequest extends FormRequest
{
    private const UTC_TIMESTAMP_PATTERN = '/^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T(?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})(?:\.(?<microsecond>\d{1,6}))?Z$/';

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
            'period_start' => ['nullable', 'string'],
            'period_end' => ['nullable', 'string'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $periodStart = $this->query('period_start');
                $periodEnd = $this->query('period_end');
                $hasStart = is_string($periodStart) && $periodStart !== '';
                $hasEnd = is_string($periodEnd) && $periodEnd !== '';

                if ($hasStart !== $hasEnd) {
                    $validator->errors()->add(
                        $hasStart ? 'period_end' : 'period_start',
                        'Informe inicio e fim do periodo juntos.'
                    );

                    return;
                }

                if (! $hasStart && ! $hasEnd) {
                    return;
                }

                if (! $this->isUtcTimestamp($periodStart)) {
                    $validator->errors()->add(
                        'period_start',
                        'Informe um timestamp UTC valido para o inicio do periodo.'
                    );
                }

                if (! $this->isUtcTimestamp($periodEnd)) {
                    $validator->errors()->add(
                        'period_end',
                        'Informe um timestamp UTC valido para o fim do periodo.'
                    );
                }

                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $parsedStart = $this->parseUtcTimestamp($periodStart);
                $parsedEnd = $this->parseUtcTimestamp($periodEnd);

                if ($parsedStart === null || $parsedEnd === null) {
                    return;
                }

                if ($parsedStart->greaterThan($parsedEnd)) {
                    $validator->errors()->add(
                        'period_start',
                        'O inicio do periodo deve ser anterior ou igual ao fim.'
                    );
                }
            },
        ];
    }

    public function closingPeriod(ResolveClosingSummaryPeriod $resolver): ClosingSummaryPeriod
    {
        $periodStart = $this->query('period_start');
        $periodEnd = $this->query('period_end');

        if (is_string($periodStart) && is_string($periodEnd) && $periodStart !== '' && $periodEnd !== '') {
            $parsedStart = $this->parseUtcTimestamp($periodStart);
            $parsedEnd = $this->parseUtcTimestamp($periodEnd);

            if ($parsedStart === null || $parsedEnd === null) {
                throw ValidationException::withMessages([
                    'period_start' => 'Informe um timestamp UTC valido para o periodo.',
                ]);
            }

            return $resolver->custom(
                $parsedStart,
                $parsedEnd,
            );
        }

        return $resolver->currentOperationalWeek();
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
            'message' => 'Revise o periodo do fechamento e tente novamente.',
            'errors' => $validator->errors(),
        ], 422));
    }

    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Acesso negado para esta area.',
        ], 403));
    }

    private function isUtcTimestamp(mixed $value): bool
    {
        return $this->parseUtcTimestamp($value) !== null;
    }

    private function parseUtcTimestamp(mixed $value): ?Carbon
    {
        if (! is_string($value) || ! preg_match(self::UTC_TIMESTAMP_PATTERN, $value, $matches)) {
            return null;
        }

        $year = (int) $matches['year'];
        $month = (int) $matches['month'];
        $day = (int) $matches['day'];
        $hour = (int) $matches['hour'];
        $minute = (int) $matches['minute'];
        $second = (int) $matches['second'];
        $microsecond = str_pad((string) ($matches['microsecond'] ?? ''), 6, '0');

        if (
            ! checkdate($month, $day, $year)
            || $hour > 23
            || $minute > 59
            || $second > 59
        ) {
            return null;
        }

        return Carbon::create(
            $year,
            $month,
            $day,
            $hour,
            $minute,
            $second,
            'UTC',
        )->setMicrosecond((int) $microsecond);
    }
}
