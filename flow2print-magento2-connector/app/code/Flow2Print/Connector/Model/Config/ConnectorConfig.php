<?php

declare(strict_types=1);

namespace Flow2Print\Connector\Model\Config;

use Flow2Print\Connector\Helper\Data;

class ConnectorConfig
{
    public function __construct(private readonly Data $helper)
    {
    }

    public function isEnabled(): bool
    {
        return $this->helper->isEnabled();
    }

    public function getBaseApiUrl(): string
    {
        return $this->helper->getBaseApiUrl();
    }
}
