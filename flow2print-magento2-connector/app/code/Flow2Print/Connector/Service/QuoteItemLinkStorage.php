<?php

declare(strict_types=1);

namespace Flow2Print\Connector\Service;

use Magento\Framework\App\ResourceConnection;

class QuoteItemLinkStorage
{
    public function __construct(
        private readonly ResourceConnection $resourceConnection
    ) {
    }

    /**
     * @param array<string, mixed>|null $pricingSignals
     */
    public function save(
        int $quoteItemId,
        string $projectId,
        ?string $projectVersionId,
        string $status,
        ?array $pricingSignals = null
    ): void {
        $connection = $this->resourceConnection->getConnection();
        $table = $this->resourceConnection->getTableName('flow2print_quote_item_link');

        $connection->insertOnDuplicate(
            $table,
            [
                'quote_item_id' => $quoteItemId,
                'flow2print_project_id' => $projectId,
                'flow2print_project_version_id' => $projectVersionId,
                'flow2print_status' => $status,
                'pricing_signals_json' => $pricingSignals !== null ? json_encode($pricingSignals) : null,
            ],
            [
                'flow2print_project_id',
                'flow2print_project_version_id',
                'flow2print_status',
                'pricing_signals_json',
                'updated_at',
            ]
        );
    }
}
