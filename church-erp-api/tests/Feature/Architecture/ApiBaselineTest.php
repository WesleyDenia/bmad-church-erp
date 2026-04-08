<?php

namespace Tests\Feature\Architecture;

use Tests\TestCase;

class ApiBaselineTest extends TestCase
{
    public function test_health_endpoint_uses_versioned_api_resource_contract(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response
            ->assertOk()
            ->assertJsonPath('data.status', 'ok')
            ->assertJsonPath('data.api_version', 'v1')
            ->assertJsonPath('data.tenant_strategy', 'church_id')
            ->assertJsonPath('data.bff_expected', true);
    }

    public function test_domain_and_http_directories_exist_for_future_growth(): void
    {
        $paths = [
            app_path('Domain/Identity/Models'),
            app_path('Domain/Identity/Services'),
            app_path('Domain/Identity/Resources'),
            app_path('Domain/Identity/Repositories'),
            app_path('Domain/Finance/Models'),
            app_path('Domain/Finance/Services'),
            app_path('Domain/Finance/Resources'),
            app_path('Domain/Finance/Repositories'),
            app_path('Domain/People/Models'),
            app_path('Domain/People/Services'),
            app_path('Domain/People/Resources'),
            app_path('Domain/People/Repositories'),
            app_path('Domain/Operations/Models'),
            app_path('Domain/Operations/Services'),
            app_path('Domain/Operations/Resources'),
            app_path('Domain/Operations/Repositories'),
            app_path('Domain/Communications/Models'),
            app_path('Domain/Communications/Services'),
            app_path('Domain/Communications/Resources'),
            app_path('Domain/Communications/Repositories'),
            app_path('Http/Controllers/Api/V1'),
            app_path('Http/Requests'),
            app_path('Policies'),
        ];

        foreach ($paths as $path) {
            $this->assertDirectoryExists($path);
        }
    }
}
