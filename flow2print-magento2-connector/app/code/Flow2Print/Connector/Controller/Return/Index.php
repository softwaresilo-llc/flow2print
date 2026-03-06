<?php

declare(strict_types=1);

namespace Flow2Print\Connector\Controller\Return;

use Flow2Print\Connector\Service\ReturnHandler;
use Magento\Framework\App\Action\Action;
use Magento\Framework\App\Action\Context;
use Magento\Framework\Controller\Result\JsonFactory;

class Index extends Action
{
    public function __construct(
        Context $context,
        private readonly JsonFactory $resultJsonFactory,
        private readonly ReturnHandler $returnHandler
    ) {
        parent::__construct($context);
    }

    public function execute()
    {
        $projectId = (string) $this->getRequest()->getParam('project_id', '');
        $quoteItemId = (int) $this->getRequest()->getParam('quote_item_id', 0);
        $orderItemId = (int) $this->getRequest()->getParam('order_item_id', 0);

        $result = $this->resultJsonFactory->create();
        return $result->setData($this->returnHandler->handle(
            $projectId,
            $quoteItemId > 0 ? $quoteItemId : null,
            $orderItemId > 0 ? $orderItemId : null
        ));
    }
}
