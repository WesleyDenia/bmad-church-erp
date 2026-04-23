<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreInitialChurchSetupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'church_name' => ['required', 'string', 'max:160'],
            'admin_name' => ['required', 'string', 'max:160'],
            'admin_email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'church_name.required' => 'Informe o nome da igreja.',
            'church_name.max' => 'Use um nome de igreja com ate 160 caracteres.',
            'admin_name.required' => 'Informe o nome da pessoa administradora.',
            'admin_name.max' => 'Use um nome com ate 160 caracteres.',
            'admin_email.required' => 'Informe o email da pessoa administradora.',
            'admin_email.email' => 'Informe um email valido.',
            'admin_email.unique' => 'Este email ja esta em uso.',
            'password.required' => 'Informe uma senha.',
            'password.min' => 'Use uma senha com pelo menos 8 caracteres.',
            'password.confirmed' => 'A confirmacao da senha precisa ser igual a senha.',
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Revise os campos destacados e tente novamente.',
            'errors' => $validator->errors(),
        ], 422));
    }
}
