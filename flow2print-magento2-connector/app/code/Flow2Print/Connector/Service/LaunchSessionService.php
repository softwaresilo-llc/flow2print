<?php

declare(strict_types=1);

namespace Flow2Print\Connector\Service;

use Flow2Print\Connector\Api\Data\LaunchSessionInterface;
use Flow2Print\Connector\Api\Flow2PrintClientInterface;
use Magento\Store\Model\StoreManagerInterface;

class LaunchSessionService
{
    public function __construct(
        private readonly Flow2PrintClientInterface $client,
        private readonly StoreManagerInterface $storeManager
    ) {
    }

    /**
     * @param array<string, string|int|bool> $options
     */
    public function create(
        string $productRef,
        string $customerEmail,
        bool $isGuest,
        string $returnUrl,
        array $options = [],
        ?string $externalCustomerRef = null,
        ?string $externalVariantRef = null
    ): LaunchSessionInterface {
        $store = $this->storeManager->getStore();

        $payload = [
            'connectorType' => 'magento2',
            'externalStoreId' => (string) $store->getCode(),
            'externalProductRef' => $productRef,
            'customer' => [
                'email' => $customerEmail,
                'isGuest' => $isGuest,
            ],
            'locale' => (string) $store->getLocaleCode(),
            'currency' => (string) $store->getCurrentCurrencyCode(),
            'returnUrl' => $returnUrl,
            'options' => $options,
        ];

        if ($externalCustomerRef !== null && $externalCustomerRef !== '') {
            $payload['customer']['externalCustomerRef'] = $externalCustomerRef;
        }

        if ($externalVariantRef !== null && $externalVariantRef !== '') {
            $payload['externalVariantRef'] = $externalVariantRef;
        }

        return $this->client->createLaunchSession($payload);
    }
}
