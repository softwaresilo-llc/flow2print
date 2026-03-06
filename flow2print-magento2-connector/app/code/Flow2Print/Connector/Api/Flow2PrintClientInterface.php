<?php

declare(strict_types=1);

namespace Flow2Print\Connector\Api;

use Flow2Print\Connector\Api\Data\LaunchSessionInterface;

interface Flow2PrintClientInterface
{
    /**
     * @param array<string, mixed> $payload
     */
    public function createLaunchSession(array $payload): LaunchSessionInterface;

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function createQuoteLink(array $payload): array;

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function createOrderLink(array $payload): array;

    /**
     * @return array<string, mixed>
     */
    public function getProjectStatus(string $projectId): array;
}
