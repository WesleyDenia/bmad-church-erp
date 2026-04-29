<?php

namespace App\Domain\Identity\Services;

class ResolveBackofficeAreaAccessService
{
    /**
     * @var array<string, list<string>>
     */
    private const ROLE_AREA_MATRIX = [
        'administrator' => ['secretaria', 'communications'],
        'secretary' => ['secretaria', 'communications'],
        'treasurer' => ['treasury'],
        'leadership' => ['leadership'],
    ];

    /**
     * @return list<string>
     */
    public function allowedAreasForRole(string $role): array
    {
        return self::ROLE_AREA_MATRIX[$role] ?? [];
    }

    public function canAccess(string $role, string $area): bool
    {
        return in_array($area, $this->allowedAreasForRole($role), true);
    }
}
