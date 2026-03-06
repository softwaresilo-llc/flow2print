<?php

declare(strict_types=1);

namespace Flow2Print\Connector\Service;

use Magento\Framework\App\ResourceConnection;

class SyncLedgerService
{
    public function __construct(
        private readonly ResourceConnection $resourceConnection
    ) {
    }

    /**
     * @param array<string, mixed>|null $payload
     */
    public function append(string $eventType, ?string $externalRef = null, string $status = 'pending', ?array $payload = null): void
    {
        $connection = $this->resourceConnection->getConnection();
        $table = $this->resourceConnection->getTableName('flow2print_sync_ledger');

        $connection->insert($table, [
            'event_type' => $eventType,
            'external_ref' => $externalRef,
            'status' => $status,
            'payload_json' => $payload !== null ? json_encode($payload) : null,
        ]);
    }
}
