<?php

declare(strict_types=1);

namespace Flow2Print\Connector\Helper;

use Magento\Framework\App\Helper\AbstractHelper;
use Magento\Store\Model\ScopeInterface;

class Data extends AbstractHelper
{
    public const XML_PATH_ENABLED = 'flow2print/general/enabled';
    public const XML_PATH_BASE_API_URL = 'flow2print/general/base_api_url';
    public const XML_PATH_CLIENT_ID = 'flow2print/general/client_id';
    public const XML_PATH_CLIENT_SECRET = 'flow2print/general/client_secret';
    public const XML_PATH_WEBHOOK_SECRET = 'flow2print/general/webhook_secret';
    public const XML_PATH_ALLOW_GUEST_DESIGNS = 'flow2print/general/allow_guest_designs';
    public const XML_PATH_REQUIRE_FINALIZED_BEFORE_ADD_TO_CART = 'flow2print/general/require_finalized_before_add_to_cart';

    public function isEnabled(?string $scopeCode = null): bool
    {
        return $this->scopeConfig->isSetFlag(self::XML_PATH_ENABLED, ScopeInterface::SCOPE_STORE, $scopeCode);
    }

    public function getBaseApiUrl(?string $scopeCode = null): string
    {
        return (string) $this->scopeConfig->getValue(self::XML_PATH_BASE_API_URL, ScopeInterface::SCOPE_STORE, $scopeCode);
    }

    public function getClientId(?string $scopeCode = null): string
    {
        return (string) $this->scopeConfig->getValue(self::XML_PATH_CLIENT_ID, ScopeInterface::SCOPE_STORE, $scopeCode);
    }

    public function getClientSecret(?string $scopeCode = null): string
    {
        return (string) $this->scopeConfig->getValue(self::XML_PATH_CLIENT_SECRET, ScopeInterface::SCOPE_STORE, $scopeCode);
    }

    public function getWebhookSecret(?string $scopeCode = null): string
    {
        return (string) $this->scopeConfig->getValue(self::XML_PATH_WEBHOOK_SECRET, ScopeInterface::SCOPE_STORE, $scopeCode);
    }

    public function allowGuestDesigns(?string $scopeCode = null): bool
    {
        return $this->scopeConfig->isSetFlag(self::XML_PATH_ALLOW_GUEST_DESIGNS, ScopeInterface::SCOPE_STORE, $scopeCode);
    }

    public function requireFinalizedBeforeAddToCart(?string $scopeCode = null): bool
    {
        return $this->scopeConfig->isSetFlag(self::XML_PATH_REQUIRE_FINALIZED_BEFORE_ADD_TO_CART, ScopeInterface::SCOPE_STORE, $scopeCode);
    }
}
