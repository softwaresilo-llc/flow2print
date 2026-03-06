<?php

declare(strict_types=1);

namespace Flow2Print\Connector\Service;

use Magento\Framework\App\ResourceConnection;

class OrderItemLinkStorage
{
    public function __construct(
        private readonly ResourceConnection $resourceConnection
    ) {
    }

    public function save(
        int $orderItemId,
        string $projectId,
        ?string $projectVersionId,
        ?string $outputArtifactRef,
        ?string $preflightStatus
    ): void {
        $connection = $this->resourceConnection->getConnection();
        $table = $this->resourceConnection->getTableName('flow2print_order_item_link');

        $connection->insertOnDuplicate(
            $table,
            [
                'order_item_id' => $orderItemId,
                'flow2print_project_id' => $projectId,
                'flow2print_project_version_id' => $projectVersionId,
                'output_artifact_ref' => $outputArtifactRef,
                'preflight_status' => $preflightStatus,
            ],
            [
                'flow2print_project_id',
                'flow2print_project_version_id',
                'output_artifact_ref',
                'preflight_status',
                'updated_at',
            ]
        );
    }
}
