require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const walletService = require('./services/wallet');
const vietqrService = require('./services/vietqr');
const taxcodeValidator = require('./services/taxcodeValidator');
const invoiceParser = require('./services/invoiceParser');
const erc8004Service = require('./services/erc8004');
const x402Middleware = require('./middleware/x402');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets
app.use(express.static(path.join(__dirname, 'public')));

// 1. Health & System Diagnostic
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'TaxLens AI - Vietnamese VAT & Tax Sentinel',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    aiModel: process.env.AI_MODEL_NAME || 'Gemini 3.8 Flash (Active Engine)',
    settlementNetwork: 'Base L2 (Chain ID: 8453)',
    humanGateway: 'VietQR / Napas 24/7'
  });
});

// 2. ERC-8004 Agent Discovery Manifest
const handleManifest = (req, res) => {
  const hostUrl = `${req.protocol}://${req.get('host')}`;
  res.json(erc8004Service.getManifest(hostUrl));
};
app.get('/.well-known/erc-8004.json', handleManifest);
app.get('/api/agent-manifest', handleManifest);

// 3. Preset Samples for 1-Click Interactive Demo
app.get('/api/samples', (req, res) => {
  res.json({
    status: 'success',
    samples: invoiceParser.PRESET_SAMPLES
  });
});

// 4. Core Micro-Tool API: Extract & Audit Electronic Invoice (Guarded by x402)
app.post('/api/v1/extract-invoice', x402Middleware(), (req, res) => {
  try {
    const { rawText, sampleId } = req.body;
    let contentToParse = rawText;

    if (sampleId && invoiceParser.PRESET_SAMPLES[sampleId]) {
      contentToParse = invoiceParser.PRESET_SAMPLES[sampleId].rawText;
    }

    if (!contentToParse || typeof contentToParse !== 'string' || contentToParse.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Dữ liệu nội dung hóa đơn không được để trống. Vui lòng cung cấp văn bản hóa đơn hoặc chọn sampleId.'
      });
    }

    const parsedResult = invoiceParser.parseInvoiceText(contentToParse);
    const accountingEntries = invoiceParser.exportAccountingFormat(parsedResult);

    res.json({
      status: 'success',
      auth: {
        type: req.authType,
        remainingCredits: req.remainingCredits !== undefined ? req.remainingCredits : 'N/A (x402 on-chain)',
        txProof: req.txProof || null
      },
      invoice: parsedResult,
      accountingExport: accountingEntries
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Lỗi khi trích xuất hóa đơn: ' + error.message
    });
  }
});

// 5. Core Micro-Tool API: Verify Tax Code & Checksum (Guarded by x402)
app.post('/api/v1/verify-taxcode', x402Middleware(), (req, res) => {
  try {
    const { taxCode } = req.body;
    if (!taxCode) {
      return res.status(400).json({
        status: 'error',
        message: 'Mã số thuế (taxCode) không được để trống.'
      });
    }

    const validationResult = taxcodeValidator.validateTaxCode(taxCode);
    res.json({
      status: 'success',
      auth: {
        type: req.authType,
        remainingCredits: req.remainingCredits !== undefined ? req.remainingCredits : 'N/A (x402 on-chain)',
        txProof: req.txProof || null
      },
      result: validationResult
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Lỗi khi xác thực mã số thuế: ' + error.message
    });
  }
});

// 6. Export Accounting Data
app.post('/api/v1/export-accounting', (req, res) => {
  try {
    const { invoiceData } = req.body;
    if (!invoiceData || !invoiceData.metadata) {
      return res.status(400).json({
        status: 'error',
        message: 'Cần cung cấp dữ liệu invoiceData hợp lệ.'
      });
    }
    const result = invoiceParser.exportAccountingFormat(invoiceData);
    res.json({
      status: 'success',
      accounting: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// 7. Human Monetization: Pricing Plans
app.get('/api/payment/plans', (req, res) => {
  res.json({
    status: 'success',
    plans: vietqrService.PRICING_PLANS
  });
});

// 8. Human Monetization: Create VietQR Order
app.post('/api/payment/vietqr/create-order', (req, res) => {
  try {
    const { planId, clientEmail } = req.body;
    const order = vietqrService.createPaymentOrder(planId, clientEmail);
    res.json({
      status: 'success',
      order
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// 9. Payment Confirmation (Simulation / Webhook)
app.post('/api/payment/vietqr/confirm-order', (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ status: 'error', message: 'Mã orderId là bắt buộc.' });
    }
    const result = vietqrService.confirmOrderPayment(orderId);
    res.json({
      status: 'success',
      ...result
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// 10. Check User Info & Credits
app.get('/api/user/:apiKey', (req, res) => {
  const user = vietqrService.getUserInfo(req.params.apiKey);
  if (!user) {
    return res.status(404).json({ status: 'error', message: 'Không tìm thấy API Key.' });
  }
  res.json({
    status: 'success',
    user
  });
});

// 11. Web3 Wallet & Revenue Tracking
app.get('/api/wallet', (req, res) => {
  const wallet = walletService.getWalletInfo();
  res.json({
    status: 'success',
    wallet
  });
});

// 12. Admin & Creator Portal: Rút tiền (Withdraw)
app.post('/api/admin/withdraw', (req, res) => {
  try {
    const { targetAddress, amountUSDC, adminKey } = req.body;
    const result = walletService.withdrawRevenue(
      targetAddress,
      parseFloat(amountUSDC),
      adminKey
    );
    res.json({
      status: 'success',
      payout: result
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// 13. Admin Transactions Feed
app.get('/api/admin/transactions', (req, res) => {
  const list = walletService.getRecentTransactions();
  res.json({
    status: 'success',
    transactions: list
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 TaxLens AI Micro-SaaS Server is Running!`);
  console.log(`📡 Local Port: http://localhost:${PORT}`);
  console.log(`💳 x402 Base Settlement: ${process.env.AGENT_WALLET_ADDRESS}`);
  console.log(`⚡ VietQR Gateway: Napas 24/7 (${process.env.VIETQR_BANK_ID} - ${process.env.VIETQR_ACCOUNT_NO})`);
  console.log(`🤖 ERC-8004 Manifest: http://localhost:${PORT}/.well-known/erc-8004.json`);
  console.log(`====================================================`);
});
