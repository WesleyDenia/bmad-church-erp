<?php

namespace Tests\Unit\Identity;

use App\Domain\Identity\Services\CreateInitialChurchSetupService;
use Illuminate\Database\QueryException;
use PDOException;
use ReflectionMethod;
use Tests\TestCase;

class CreateInitialChurchSetupServiceTest extends TestCase
{
    public function test_duplicate_constraint_detection_matches_sqlite_unique_violations(): void
    {
        $service = new CreateInitialChurchSetupService();

        $exception = $this->makeQueryException(
            'sqlite',
            ['23000', 19, 'UNIQUE constraint failed: users.email'],
            'insert into users ...',
        );

        self::assertTrue($this->invokeDuplicateConstraintCheck($service, $exception));
    }

    public function test_duplicate_constraint_detection_ignores_operational_failures(): void
    {
        $service = new CreateInitialChurchSetupService();

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
