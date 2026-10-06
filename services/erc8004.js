/**
 * TaxLens AI - ERC-8004 Autonomous Agent Discovery Registry Service
 * Provides standardized manifest for agent-to-agent capability discovery and automated commerce.
 */

function getManifest(baseUrl) {
  const agentWallet = process.env.AGENT_WALLET_ADDRESS || '0x4545050c91476cb7a93e810296ed1105c14a590e';
  const priceUSDC = process.env.X402_PRICE_USDC || '0.005';

  return {
    standard: 'ERC-8004',
    schemaVersion: '1.0.0',
    agent: {
      id: 'did:agent:base:taxlens-vn-ai',
      name: 'TaxLens AI - Vietnamese VAT & Tax Code Sentinel',
      tagline: 'Autonomous AI Agent for VAT Invoice Parsing, Circular 78 Audit, and Vietnamese Tax Registry Verification',
      category: 'fintech-accounting-agent',
      developer: 'Autonomous Agent Commerce Engine',
      homepage: baseUrl,
      walletAddress: agentWallet,
      settlementChain: {
        network: 'Base',
        chainId: 8453,
        token: 'USDC',
        tokenContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
      }
    },
    capabilities: [
      {
        id: 'vat_invoice_extraction',
        name: 'Trích Xuất Hóa Đơn Điện Tử VAT',
        description: 'Bóc tách Ký hiệu, Số HĐ, Đơn vị bán/mua, Danh mục mặt hàng, Đơn giá, Thuế suất VAT (0/5/8/10%) và Tổng thanh toán.',
        endpoint: `${baseUrl}/api/v1/extract-invoice`,
        method: 'POST',
        costPerCall: `${priceUSDC} USDC`,
        paymentMethod: 'x402'
      },
      {
        id: 'tax_code_verification',
        name: 'Xác Thực Checksum Mã Số Thuế 63 Tỉnh Thành',
        description: 'Kiểm tra thuật toán Modulo 11 của Tổng Cục Thuế, nhận diện địa bàn tỉnh thành, phân loại MST 10 số (mẹ) và 13 số (chi nhánh).',
        endpoint: `${baseUrl}/api/v1/verify-taxcode`,
        method: 'POST',
        costPerCall: `${priceUSDC} USDC`,
        paymentMethod: 'x402'
      },
      {
        id: 'accounting_export',
        name: 'Chuyển Đổi Định Dạng Kế Toán ERP',
        description: 'Chuyển đổi dữ liệu hóa đơn thành bút toán nợ/có chuẩn định dạng MISA SME, Fast Accounting, hoặc JSON.',
        endpoint: `${baseUrl}/api/v1/export-accounting`,
        method: 'POST',
        costPerCall: 'Included in extraction'
      }
    ],
    pricing: {
      protocol: 'x402',
      defaultCurrency: 'USDC',
      rate: parseFloat(priceUSDC),
      paymentHeader: 'X-Payment-Proof',
      requiredNetwork: 'Base L2'
    },
    terms: {
      uptimeGuarantee: '99.9%',
      dataRetention: 'Zero-log privacy guarantee for submitted invoice records',
      support: 'Autonomous agent protocol handler'
    }
  };
}

module.exports = {
  getManifest
};
