<?php

declare(strict_types=1);

namespace Flow2Print\Connector\Api\Data;

interface LaunchSessionInterface
{
    public function getLaunchSessionId(): string;

    public function getProjectId(): string;

    public function getDesignerUrl(): string;

    public function getExpiresAt(): string;
}
