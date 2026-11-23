<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table): void {
            $table->id();
            $table->string('key', 160)->unique();
            $table->longText('value');
            $table->string('type', 64);
        });

        DB::table('settings')->insert([
            'key' => 'legal.terms_of_use.v1',
            'value' => <<<'TEXT'
VERSAO PROVISORIA PARA HOMOLOGACAO

Este texto e apenas um modelo temporario e deve ser substituido pela versao juridicamente aprovada antes da publicacao em producao.

Ao criar a conta, a pessoa administradora declara que possui legitimidade para cadastrar a igreja e utilizar o sistema. Os dados pessoais informados serao tratados para criar e administrar a conta, configurar o ambiente da igreja e prestar o servico solicitado.

O controlador deve disponibilizar informacoes claras sobre as finalidades, os direitos da pessoa titular e o canal para solicitacoes relacionadas a privacidade. Este aceite registra a concordancia com estes termos de uso e nao substitui a definicao da base legal aplicavel a cada atividade de tratamento de dados pessoais.
TEXT,
            'type' => 'legal_document',
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
