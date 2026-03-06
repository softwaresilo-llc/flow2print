<?php

declare(strict_types=1);

namespace Flow2Print\Connector\Model\Api;

use Flow2Print\Connector\Api\Data\LaunchSessionInterface;

class LaunchSession implements LaunchSessionInterface
{
    public function __construct(
        private readonly string $launchSessionId,
        private readonly string $projectId,
        private readonly string $designerUrl,
        private readonly string $expiresAt
    ) {
    }

    public function getLaunchSessionId(): string
    {
        return $this->launchSessionId;
    }

    public function getProjectId(): string
    {
        return $this->projectId;
    }

    public function getDesignerUrl(): string
    {
        return $this->designerUrl;
    }

    public function getExpiresAt(): string
    {
        return $this->expiresAt;
    }
}
