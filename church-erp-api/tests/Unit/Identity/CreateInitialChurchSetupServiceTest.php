<?php

namespace Tests\Unit\Identity;

use App\Domain\Finance\Models\FinancialCategory;
use App\Domain\Finance\Services\ProvisionInitialFinancialCategoriesService;
use App\Domain\Identity\Models\Church;
use App\Domain\Identity\Services\CreateInitialChurchSetupService;
use App\Domain\People\Models\PersonCategory;
use App\Domain\People\Services\ProvisionInitialPersonCategoriesService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PDOException;
use ReflectionMethod;
use RuntimeException;
use Tests\TestCase;

class CreateInitialChurchSetupServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_service_provisions_minimum_categories_for_the_new_church(): void
    {
        $service = $this->app->make(CreateInitialChurchSetupService::class);

        $result = $service->create([
            'church_name' => 'Igreja Esperanca',
            'admin_name' => 'Ana Lima',
            'admin_email' => 'ana@example.com',
            'password' => 'secret-password',
        ]);

        $churchId = $result['church']->id;

        self::assertSame(
            4,
            FinancialCategory::query()->withoutGlobalScopes()->where('church_id', $churchId)->count(),
        );
        self::assertSame(
            3,
            PersonCategory::query()->withoutGlobalScopes()->where('church_id', $churchId)->count(),
        );
    }

    public function test_create_service_rolls_back_when_category_provisioning_throws(): void
    {
        $this->app->bind(ProvisionInitialPersonCategoriesService::class, function (): ProvisionInitialPersonCategoriesService {
            return new class extends ProvisionInitialPersonCategoriesService
            {
                public function provision(Church $church): void
                {
                    throw new RuntimeException('Provisioning failed.');
                }
            };
        });

        $service = $this->app->make(CreateInitialChurchSetupService::class);

        try {
            $service->create([
                'church_name' => 'Igreja Esperanca',
                'admin_name' => 'Ana Lima',
                'admin_email' => 'ana@example.com',
                'password' => 'secret-password',
            ]);

            self::fail('Expected provisioning failure to bubble up.');
        } catch (RuntimeException $exception) {
            self::assertSame('Provisioning failed.', $exception->getMessage());
        }

        self::assertDatabaseCount('churches', 0);
        self::assertDatabaseCount('users', 0);
        self::assertDatabaseCount('church_user', 0);
    }

    public function test_create_service_rolls_back_when_financial_provisioning_throws(): void
    {
        $this->app->bind(ProvisionInitialFinancialCategoriesService::class, function (): ProvisionInitialFinancialCategoriesService {
            return new class extends ProvisionInitialFinancialCategoriesService
            {
                public function provision(Church $church): void
                {
                    throw new RuntimeException('Financial provisioning failed.');
                }
            };
        });

        $service = $this->app->make(CreateInitialChurchSetupService::class);

        try {
            $service->create([
                'church_name' => 'Igreja Esperanca',
                'admin_name' => 'Ana Lima',
                'admin_email' => 'ana@example.com',
                'password' => 'secret-password',
            ]);

            self::fail('Expected provisioning failure to bubble up.');
        } catch (RuntimeException $exception) {
            self::assertSame('Financial provisioning failed.', $exception->getMessage());
        }

        self::assertDatabaseCount('churches', 0);
        self::assertDatabaseCount('users', 0);
        self::assertDatabaseCount('church_user', 0);
    }

    public function test_create_service_reuses_the_existing_setup_when_bootstrap_is_reprocessed(): void
    {
        $service = $this->app->make(CreateInitialChurchSetupService::class);

        $firstResult = $service->create([
            'church_name' => 'Igreja Esperanca',
            'admin_name' => 'Ana Lima',
            'admin_email' => 'ana@example.com',
            'password' => 'secret-password',
        ]);

        $secondResult = $service->create([
            'church_name' => 'Igreja Esperanca',
            'admin_name' => 'Ana Lima',
            'admin_email' => 'ana@example.com',
            'password' => 'secret-password',
        ]);

        self::assertSame($firstResult['church']->id, $secondResult['church']->id);
        self::assertSame($firstResult['admin']->id, $secondResult['admin']->id);
        self::assertSame($firstResult['membership']->id, $secondResult['membership']->id);
        self::assertDatabaseCount('churches', 1);
        self::assertDatabaseCount('users', 1);
        self::assertDatabaseCount('church_user', 1);
        self::assertDatabaseCount('financial_categories', 4);
        self::assertDatabaseCount('person_categories', 3);
    }

    public function test_duplicate_constraint_detection_matches_sqlite_unique_violations(): void
    {
        $service = $this->app->make(CreateInitialChurchSetupService::class);

        $exception = $this->makeQueryException(
            'sqlite',
            ['23000', 19, 'UNIQUE constraint failed: users.email'],
            'insert into users ...',
        );

        self::assertTrue($this->invokeDuplicateConstraintCheck($service, $exception));
    }

    public function test_duplicate_constraint_detection_ignores_operational_failures(): void
    {
        $service = $this->app->make(CreateInitialChurchSetupService::class);

        $exception = $this->makeQueryException(
            'mysql',
            ['HY000', 2002, 'Connection refused'],
            'insert into churches ...',
        );

        self::assertFalse($this->invokeDuplicateConstraintCheck($service, $exception));
    }

    /**
     * @param  array{0: string, 1: int, 2: string}  $errorInfo
     */
    private function makeQueryException(string $connection, array $errorInfo, string $sql): QueryException
    {
        $previous = new PDOException($errorInfo[2], (int) $errorInfo[1]);
        $previous->errorInfo = $errorInfo;

        return new QueryException($connection, $sql, [], $previous);
    }

    private function invokeDuplicateConstraintCheck(
        CreateInitialChurchSetupService $service,
        QueryException $exception,
    ): bool {
        $method = new ReflectionMethod($service, 'isDuplicateConstraintViolation');
        $method->setAccessible(true);

        return (bool) $method->invoke($service, $exception);
    }
}
