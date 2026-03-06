<?php

declare(strict_types=1);

namespace Flow2Print\Connector\Model;

use Flow2Print\Connector\Api\Data\LaunchSessionInterface;
use Flow2Print\Connector\Api\Flow2PrintClientInterface;
use Flow2Print\Connector\Helper\Data;
use Flow2Print\Connector\Model\Api\LaunchSession;
use Magento\Framework\HTTP\Client\Curl;

class Flow2PrintClient implements Flow2PrintClientInterface
{
    public function __construct(
        private readonly Curl $curl,
        private readonly Data $config
    ) {
    }

    public function createLaunchSession(array $payload): LaunchSessionInterface
    {
        $decoded = $this->request('POST', '/v1/launch-sessions', $payload);

        return new LaunchSession(
            (string) ($decoded['launchSessionId'] ?? ''),
            (string) ($decoded['projectId'] ?? ''),
            (string) ($decoded['designerUrl'] ?? ''),
            (string) ($decoded['expiresAt'] ?? '')
        );
    }

    public function createQuoteLink(array $payload): array
    {
        return $this->request('POST', '/v1/connectors/magento2/quote-links', $payload);
    }

    public function createOrderLink(array $payload): array
    {
        return $this->request('POST', '/v1/connectors/magento2/order-links', $payload);
    }

    public function getProjectStatus(string $projectId): array
    {
        $decoded = $this->request('GET', sprintf('/v1/connectors/magento2/projects/%s/status', rawurlencode($projectId)));

        return $decoded !== [] ? $decoded : [
            'projectId' => $projectId,
            'status' => 'unknown',
        ];
    }

    /**
     * @param array<string, mixed>|null $payload
     * @return array<string, mixed>
     */
    private function request(string $method, string $path, ?array $payload = null): array
    {
        $baseUrl = rtrim($this->config->getBaseApiUrl(), '/');
        $this->curl->addHeader('Accept', 'application/json');
        $this->curl->addHeader('Content-Type', 'application/json');

        if ($this->config->getClientId() !== '') {
            $this->curl->addHeader('X-Flow2Print-Client-Id', $this->config->getClientId());
        }

        if ($this->config->getClientSecret() !== '') {
            $this->curl->addHeader('X-Flow2Print-Client-Secret', $this->config->getClientSecret());
        }

        $url = $baseUrl . $path;

        if ($method === 'POST') {
            $this->curl->post($url, $payload !== null ? json_encode($payload) : '{}');
        } else {
            $this->curl->get($url);
        }

        $decoded = json_decode($this->curl->getBody(), true);

        return is_array($decoded) ? $decoded : [];
    }
}
