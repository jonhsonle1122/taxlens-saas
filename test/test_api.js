/**
 * TaxLens AI - Automated Test Suite
 * Validates Endpoints, Tax Code Checksums, x402 Micropayments & VietQR Gateway.
 */

const http = require('http');

const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: json
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting TaxLens AI Automated Test Suite...');
  console.log(`🎯 Testing Target: ${BASE_URL}`);
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✓ PASS: ${message}`);
    } else {
      console.error(`  ✕ FAIL: ${message}`);
    }
  }

  try {
    // 1. Health check
    console.log('[Test 1] Health Check & Diagnostics (/health)');
    const health = await makeRequest('GET', '/health');
    assert(health.statusCode === 200, 'HTTP status is 200');
    assert(health.body.status === 'healthy', 'Status is healthy');
    assert(health.body.aiModel.includes('Gemini 3.8 Flash'), 'AI Model indicates Gemini 3.8 Flash');

    // 2. ERC-8004 Manifest
    console.log('\n[Test 2] ERC-8004 Discovery Manifest (/.well-known/erc-8004.json)');
    const manifest = await makeRequest('GET', '/.well-known/erc-8004.json');
    assert(manifest.statusCode === 200, 'HTTP status is 200');
    assert(manifest.body.standard === 'ERC-8004', 'Standard is ERC-8004');
    assert(manifest.body.capabilities.length >= 3, 'Manifest lists at least 3 capabilities');
    assert(manifest.body.pricing.protocol === 'x402', 'Pricing protocol is x402');

    // 3. Tax Code Validator Checksum Unit Logic via API
    console.log('\n[Test 3] Vietnamese Tax Code Validation & Checksum Modulo 11');
    const vngTax = await makeRequest('POST', '/api/v1/verify-taxcode', { 'X-API-Key': 'demo-free-key-guest' }, { taxCode: '0303490096' });
    assert(vngTax.statusCode === 200, 'VNG Tax HTTP 200');
    assert(vngTax.body.result.isValid === true, 'VNG MST 0303490096 is valid');
    assert(vngTax.body.result.checksumVerified === true, 'VNG MST checksum verified');
    assert(vngTax.body.result.provinceName === 'TP. Hồ Chí Minh', 'Province identified as TP.HCM');

    const fptTax = await makeRequest('POST', '/api/v1/verify-taxcode', { 'X-API-Key': 'demo-free-key-guest' }, { taxCode: '0101248141' });
    assert(fptTax.body.result.isValid === true, 'FPT MST 0101248141 is valid');
    assert(fptTax.body.result.provinceName === 'Hà Nội', 'Province identified as Hà Nội');

    const invalidTax = await makeRequest('POST', '/api/v1/verify-taxcode', { 'X-API-Key': 'demo-free-key-guest' }, { taxCode: '0301446099' });
    assert(invalidTax.body.result.isValid === false, 'Invalid MST 0301446099 rejected');
    assert(invalidTax.body.result.riskLevel === 'HIGH', 'Risk level marked HIGH for invalid checksum');

    // 4. x402 Micropayments Challenge (No Auth)
    console.log('\n[Test 4] x402 Micropayment Protocol Challenge (No Key/Proof)');
    const challenge402 = await makeRequest('POST', '/api/v1/extract-invoice', {}, { sampleId: 'fpt_retail' });
    assert(challenge402.statusCode === 402, 'Returns HTTP 402 Payment Required');
    assert(challenge402.headers['x-payment-required'] === 'true', 'Header X-Payment-Required present');
    assert(challenge402.headers['x-payment-address'].startsWith('0x'), 'Header X-Payment-Address has Base wallet');
    assert(challenge402.body.x402Protocol.pricePerCall === '0.005 USDC', 'Price per call is 0.005 USDC');

    // 5. Invoice Extraction with x402 Payment Proof
    console.log('\n[Test 5] Invoice Extraction via x402 Payment Proof (Autonomous Agent Channel)');
    const mockTxHash = '0x' + Array.from({length: 64}, () => 'a').join('');
    const extractRes = await makeRequest('POST', '/api/v1/extract-invoice', {
      'X-Payment-Proof': mockTxHash,
      'X-Agent-Identity': 'Automaton-Subagent-Tester'
    }, { sampleId: 'fpt_retail' });

    assert(extractRes.statusCode === 200, 'Returns HTTP 200 OK after valid x402 proof');
    assert(extractRes.body.status === 'success', 'Extraction status is success');
    assert(extractRes.body.invoice.metadata.invoiceNumber === '0048291', 'Invoice number matches FPT sample (0048291)');
    assert(extractRes.body.invoice.financialSummary.totalAmount === 47850000, 'Total payment matches 47.850.000đ');
    assert(extractRes.body.invoice.audit.isMathAccurate === true, 'Invoice math integrity verified 100%');
    assert(extractRes.body.accountingExport.ERP_FORMAT === 'MISA_SME_IMPORT_V2', 'Export contains MISA accounting format');

    // 6. VietQR Gateway Flow (Human Monetization)
    console.log('\n[Test 6] VietQR Gateway Order Creation & Payment Confirmation');
    const orderRes = await makeRequest('POST', '/api/payment/vietqr/create-order', {}, { planId: 'starter', clientEmail: 'test@accountant.vn' });
    assert(orderRes.statusCode === 200, 'Order created successfully');
    assert(orderRes.body.order.amountVND === 29000, 'Order amount is 29.000 VND');
    assert(orderRes.body.order.qrImageUrl.includes('vietqr.io'), 'VietQR image URL generated');

    const confirmRes = await makeRequest('POST', '/api/payment/vietqr/confirm-order', {}, { orderId: orderRes.body.order.orderId });
    assert(confirmRes.statusCode === 200, 'Payment confirmed successfully');
    assert(confirmRes.body.apiKey.startsWith('taxlens_'), 'New API Key issued to customer');
    assert(confirmRes.body.creditsAdded === 50, '50 credits allocated to user');

    // 7. Wallet & Revenue Tracking
    console.log('\n[Test 7] Web3 Wallet Balance & Revenue Metrics');
    const walletRes = await makeRequest('GET', '/api/wallet');
    assert(walletRes.statusCode === 200, 'Wallet API returns 200');
    assert(walletRes.body.wallet.availableBalanceUSDC >= 0.005, 'USDC balance increased from x402 call');
    assert(walletRes.body.wallet.totalEarnedVND >= 29000, 'VND balance increased from VietQR confirmation');

    // 8. Admin Withdrawal
    console.log('\n[Test 8] Admin Creator Revenue Withdrawal');
    const withdrawRes = await makeRequest('POST', '/api/admin/withdraw', {}, {
      targetAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      amountUSDC: 0.005,
      adminKey: 'taxlens-admin-sec-2026'
    });
    assert(withdrawRes.statusCode === 200, 'Withdrawal completed with HTTP 200');
    assert(withdrawRes.body.payout.payoutTxHash.startsWith('0x'), 'Payout tx hash generated');

    console.log('\n====================================================');
    console.log(`🎉 TEST SUMMARY: ${passed}/${total} TESTS PASSED!`);
    console.log('====================================================\n');

    if (passed === total) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Lỗi khi chạy test suite:', err);
    process.exit(1);
  }
}

runTests();
