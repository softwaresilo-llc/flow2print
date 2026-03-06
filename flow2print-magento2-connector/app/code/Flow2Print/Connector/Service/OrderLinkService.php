<?php

declare(strict_types=1);

namespace Flow2Print\Connector\Service;

use Flow2Print\Connector\Api\Flow2PrintClientInterface;
use Magento\Store\Model\StoreManagerInterface;

class OrderLinkService
{
    public function __construct(
        private readonly Flow2PrintClientInterface $client,
        private readonly StoreManagerInterface $storeManager
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function link(
        string $projectId,
        string $orderReference,
        string $productRef,
        ?string $externalCustomerRef = null
    ): array {
        $store = $this->storeManager->getStore();

        $payload = [
            'projectId' => $projectId,
            'externalOrderRef' => $orderReference,
            'externalStoreId' => (string) $store->getCode(),
            'externalProductRef' => $productRef,
        ];

        if ($externalCustomerRef !== null && $externalCustomerRef !== '') {
            $payload['externalCustomerRef'] = $externalCustomerRef;
        }

        return $this->client->createOrderLink($payload);
    }
}
