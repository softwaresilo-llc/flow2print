<?php

declare(strict_types=1);

namespace Flow2Print\Connector\Controller\Launch;

use Flow2Print\Connector\Helper\Data;
use Flow2Print\Connector\Service\LaunchSessionService;
use Flow2Print\Connector\Service\SyncLedgerService;
use Magento\Framework\App\Action\Action;
use Magento\Framework\App\Action\Context;
use Magento\Framework\Controller\Result\RedirectFactory;

class Index extends Action
{
    public function __construct(
        Context $context,
        private readonly RedirectFactory $resultRedirectFactory,
        private readonly LaunchSessionService $launchSessionService,
        private readonly SyncLedgerService $syncLedgerService,
        private readonly Data $config
    ) {
        parent::__construct($context);
    }

    public function execute()
    {
        $resultRedirect = $this->resultRedirectFactory->create();

        if (!$this->config->isEnabled()) {
            return $resultRedirect->setPath('noroute');
        }

        $productRef = (string) $this->getRequest()->getParam('product_ref', '');
        $customerEmail = (string) $this->getRequest()->getParam('customer_email', 'guest@flow2print.local');
        $isGuest = filter_var($this->getRequest()->getParam('is_guest', true), FILTER_VALIDATE_BOOL);
        $returnUrl = (string) $this->getRequest()->getParam('return_url', $this->_url->getUrl('flow2print/return/index'));
        $externalCustomerRef = (string) $this->getRequest()->getParam('external_customer_ref', '');
        $externalVariantRef = (string) $this->getRequest()->getParam('external_variant_ref', '');

        if ($productRef === '') {
            return $resultRedirect->setPath('noroute');
        }

        if ($isGuest && !$this->config->allowGuestDesigns()) {
            return $resultRedirect->setPath('customer/account/login');
        }

        $launchSession = $this->launchSessionService->create(
            $productRef,
            $customerEmail,
            $isGuest,
            $returnUrl,
            [],
            $externalCustomerRef !== '' ? $externalCustomerRef : null,
            $externalVariantRef !== '' ? $externalVariantRef : null
        );

        $this->syncLedgerService->append('launch_session_created', $launchSession->getProjectId(), 'created', [
            'launchSessionId' => $launchSession->getLaunchSessionId(),
            'designerUrl' => $launchSession->getDesignerUrl(),
        ]);

        return $resultRedirect->setUrl($launchSession->getDesignerUrl());
    }
}
