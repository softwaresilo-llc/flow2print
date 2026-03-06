<?php

declare(strict_types=1);

namespace Flow2Print\Connector\Service;

use Flow2Print\Connector\Api\Flow2PrintClientInterface;

class ReturnHandler
{
    public function __construct(
        private readonly Flow2PrintClientInterface $client,
        private readonly SyncLedgerService $syncLedgerService,
        private readonly QuoteItemLinkStorage $quoteItemLinkStorage,
        private readonly OrderItemLinkStorage $orderItemLinkStorage
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function handle(string $projectId, ?int $quoteItemId = null, ?int $orderItemId = null): array
    {
        $status = $this->client->getProjectStatus($projectId);
        $this->syncLedgerService->append('return_status', $projectId, 'received', $status);

        if ($quoteItemId !== null && $quoteItemId > 0) {
            $this->quoteItemLinkStorage->save(
                $quoteItemId,
                $projectId,
                isset($status['projectVersionId']) ? (string) $status['projectVersionId'] : null,
                (string) ($status['status'] ?? 'unknown')
            );
        }

        if ($orderItemId !== null && $orderItemId > 0) {
            $productionArtifact = null;
            if (isset($status['artifacts']) && is_array($status['artifacts'])) {
                foreach ($status['artifacts'] as $artifact) {
                    if (is_array($artifact) && ($artifact['type'] ?? '') === 'production_pdf') {
                        $productionArtifact = isset($artifact['href']) ? (string) $artifact['href'] : null;
                        break;
                    }
                }
            }

            $this->orderItemLinkStorage->save(
                $orderItemId,
                $projectId,
                isset($status['projectVersionId']) ? (string) $status['projectVersionId'] : null,
                $productionArtifact,
                isset($status['preflightStatus']) ? (string) $status['preflightStatus'] : null
            );
        }

        return [
            'projectId' => $projectId,
            'status' => $status['status'] ?? 'unknown',
            'payload' => $status,
        ];
    }
}
