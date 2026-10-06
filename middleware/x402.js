/**
 * TaxLens AI - x402 Machine-to-Machine Payment Middleware
 * Implements HTTP 402 Payment Required protocol for sovereign autonomous AI agents on Base Network.
 */

const { recordX402Payment } = require('../services/wallet');
const { consumeUserCredit } = require('../services/vietqr');

function x402Middleware() {
  return (req, res, next) => {
    // 1. Kiểm tra API Key (Kênh người dùng / khách hàng trả góp)
    const apiKey = req.headers['x-api-key'] || (req.headers.authorization && req.headers.authorization.replace('Bearer ', ''));

    if (apiKey) {
      const creditCheck = consumeUserCredit(apiKey);
      if (creditCheck.valid) {
        req.authType = 'API_KEY';
        req.remainingCredits = creditCheck.user.remainingCredits;
        return next();
      } else {
        return res.status(403).json({
          status: 'error',
          code: 'INSUFFICIENT_CREDITS',
          message: creditCheck.reason,
          topupUrl: '/#pricing'
        });
      }
    }

    // 2. Kiểm tra X-Payment-Proof (Kênh Autonomous AI Agent trả phí vi mô on-chain)
    const paymentProof = req.headers['x-payment-proof'];

    if (paymentProof) {
      // Xác thực cấu trúc transaction hash (0x + 64 ký tự hex)
      const isValidTxHash = /^0x[a-fA-F0-9]{64}$/.test(paymentProof) || paymentProof.startsWith('mock-base-proof-');

      if (isValidTxHash) {
        const clientName = req.headers['x-agent-identity'] || 'Autonomous-Client-Bot';
        recordX402Payment(paymentProof, clientName);
        req.authType = 'X402_ONCHAIN';
        req.txProof = paymentProof;
        return next();
      } else {
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_PAYMENT_PROOF',
          message: 'Chuỗi X-Payment-Proof không đúng định dạng transaction hash của mạng Base (0x... 64 hex characters).'
        });
      }
    }

    // 3. Không có Key & không có Proof -> Kích hoạt giao thức HTTP 402 Payment Required
    const agentWallet = process.env.AGENT_WALLET_ADDRESS || '0x4545050c91476cb7a93e810296ed1105c14a590e';
    const priceUSDC = process.env.X402_PRICE_USDC || '0.005';

    res.set({
      'X-Payment-Required': 'true',
      'X-Accept-Payment': 'x402-usdc-base',
      'X-Payment-Address': agentWallet,
      'X-Payment-Amount': `${priceUSDC} USDC`,
      'X-Payment-Network': 'base-mainnet',
      'X-Payment-ChainId': '8453'
    });

    return res.status(402).json({
      status: 'error',
      statusCode: 402,
      error: 'Payment Required',
      message: 'Yêu cầu thanh toán vi mô x402 để sử dụng dịch vụ bóc tách hóa đơn & xác thực mã số thuế.',
      x402Protocol: {
        network: 'Base L2 (EIP-3009 / EVM)',
        chainId: 8453,
        token: 'USDC',
        tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        pricePerCall: `${priceUSDC} USDC`,
        recipientWallet: agentWallet,
        howToPay: 'Gửi 0.005 USDC đến địa chỉ ví trên mạng Base, sau đó gửi lại request kèm Header: X-Payment-Proof: <TX_HASH>',
        humanAlternative: 'Truy cập Web UI để quét mã VietQR nhận 3 lượt miễn phí hoặc mua gói Credit linh hoạt.'
      }
    });
  };
}

module.exports = x402Middleware;
