/**
 * TaxLens AI - Frontend Controller & Real-Time Orchestration
 */

let cachedSamples = {};
let lastExtractedData = null;
let currentPendingOrderId = null;

document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  await loadPresetSamples();
  await fetchWalletMetrics();
  await checkUserCredits();
  setupEventListeners();
  loadDefaultSample('fpt_retail');
});

// 1. Tab Navigation
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add('active');

      if (targetId === 'admin-tab') {
        fetchAdminData();
      }
    });
  });
}

// 2. Load Preset Samples from Server
async function loadPresetSamples() {
  try {
    const res = await fetch('/api/samples');
    const data = await res.json();
    if (data.status === 'success') {
      cachedSamples = data.samples;
    }
  } catch (err) {
    console.error('Không thể tải danh sách mẫu hóa đơn:', err);
  }
}

function loadDefaultSample(sampleId) {
  if (cachedSamples[sampleId]) {
    document.getElementById('invoiceRawText').value = cachedSamples[sampleId].rawText;
  }
}

// 3. Setup All Event Listeners
function setupEventListeners() {
  // Sample chips
  document.getElementById('sampleFptBtn')?.addEventListener('click', () => loadDefaultSample('fpt_retail'));
  document.getElementById('sampleViettelBtn')?.addEventListener('click', () => loadDefaultSample('viettel_telecom'));
  document.getElementById('sampleGrabBtn')?.addEventListener('click', () => loadDefaultSample('grab_mobility'));

  // Invoice Extraction
  document.getElementById('btnExtractInvoice')?.addEventListener('click', handleExtractInvoice);
  document.getElementById('btnClearInvoice')?.addEventListener('click', () => {
    document.getElementById('invoiceRawText').value = '';
    document.getElementById('invoiceEmptyState').classList.remove('hidden');
    document.getElementById('invoiceResultWrapper').classList.add('hidden');
  });

  // Export Buttons
  document.getElementById('btnCopyJson')?.addEventListener('click', () => {
    if (!lastExtractedData) return alert('Chưa có dữ liệu hóa đơn.');
    navigator.clipboard.writeText(JSON.stringify(lastExtractedData.invoice, null, 2));
    alert('Đã sao chép toàn bộ dữ liệu hóa đơn JSON vào Clipboard!');
  });

  document.getElementById('btnExportMisa')?.addEventListener('click', () => {
    if (!lastExtractedData) return alert('Chưa có dữ liệu hóa đơn.');
    navigator.clipboard.writeText(JSON.stringify(lastExtractedData.accountingExport, null, 2));
    alert('Đã sao chép bút toán kế toán MISA SME (Nợ 1561/1331, Có 331) vào Clipboard!');
  });

  // Credit check button
  document.getElementById('checkCreditsBtn')?.addEventListener('click', checkUserCredits);

  // Tax Code Validator Tab
  document.getElementById('btnValidateTaxCode')?.addEventListener('click', handleValidateTaxCode);
  document.querySelectorAll('.tax-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const mst = chip.getAttribute('data-mst');
      document.getElementById('taxCodeSearchInput').value = mst;
      handleValidateTaxCode();
    });
  });

  // Pricing Buy Buttons
  document.querySelectorAll('.btn-buy-plan').forEach(btn => {
    btn.addEventListener('click', () => {
      const planId = btn.getAttribute('data-plan');
      handleOpenPaymentModal(planId);
    });
  });

  // Modal Close
  document.getElementById('btnModalClose')?.addEventListener('click', () => {
    document.getElementById('vietQrModal').classList.add('hidden');
  });

  // Simulate VietQR payment
  document.getElementById('btnSimulatePaid')?.addEventListener('click', handleSimulatePayment);
  document.getElementById('btnUseNewApiKey')?.addEventListener('click', () => {
    const key = document.getElementById('newApiKeyDisplay').innerText;
    document.getElementById('apiKeyInput').value = key;
    document.getElementById('vietQrModal').classList.add('hidden');
    checkUserCredits();
    document.getElementById('tabInvoiceBtn').click();
  });

  // x402 Simulator Buttons
  document.getElementById('btnSimulate402')?.addEventListener('click', handleSimulate402Challenge);
  document.getElementById('btnSimulatePaymentProof')?.addEventListener('click', handleSimulatePaymentProof);

  // Admin Withdraw
  document.getElementById('btnExecuteWithdraw')?.addEventListener('click', handleWithdraw);
  document.getElementById('btnRefreshTx')?.addEventListener('click', fetchAdminData);
}

// 4. Handle Invoice Extraction
async function handleExtractInvoice() {
  const rawText = document.getElementById('invoiceRawText').value.trim();
  const apiKey = document.getElementById('apiKeyInput').value.trim();

  if (!rawText) {
    alert('Vui lòng dán nội dung hóa đơn hoặc chọn một hóa đơn mẫu.');
    return;
  }

  const btn = document.getElementById('btnExtractInvoice');
  btn.disabled = true;
  btn.innerText = 'Đang Bóc Tách & Đối Soát...';

  try {
    const res = await fetch('/api/v1/extract-invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey || 'demo-free-key-guest'
      },
      body: JSON.stringify({ rawText })
    });

    const data = await res.json();

    if (res.status === 402) {
      alert('Yêu cầu thanh toán x402 hoặc nạp thêm lượt! Xem tab "Giao Thức Bot x402" hoặc "Bảng Giá VietQR".');
      return;
    }

    if (!res.ok) {
      alert('Lỗi: ' + (data.message || 'Không thể xử lý hóa đơn.'));
      return;
    }

    lastExtractedData = data;
    renderInvoiceResult(data.invoice);
    await checkUserCredits();
    await fetchWalletMetrics();

  } catch (err) {
    alert('Lỗi kết nối server: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Bóc Tách & Đối Soát Ngay`;
  }
}

// 5. Render Extracted Invoice Result
function renderInvoiceResult(inv) {
  document.getElementById('invoiceEmptyState').classList.add('hidden');
  document.getElementById('invoiceResultWrapper').classList.remove('hidden');

  // Metadata
  document.getElementById('resSerial').innerText = inv.metadata.serial || '1C24TXX';
  document.getElementById('resInvoiceNo').innerText = inv.metadata.invoiceNumber || 'N/A';
  document.getElementById('resInvoiceDate').innerText = inv.metadata.invoiceDate || 'N/A';

  // Seller & Buyer
  document.getElementById('resSellerName').innerText = inv.seller.name;
  document.getElementById('resSellerTax').innerText = inv.seller.taxCode;
  document.getElementById('resSellerAddr').innerText = inv.seller.address;

  const sellerBadge = document.getElementById('resSellerStatusBadge');
  if (inv.seller.validation.isValid) {
    sellerBadge.className = 'tax-status-badge valid';
    sellerBadge.innerText = '✓ Checksum Hợp Lệ';
  } else {
    sellerBadge.className = 'tax-status-badge invalid';
    sellerBadge.innerText = '✕ Sai Checksum TCT';
  }

  document.getElementById('resBuyerName').innerText = inv.buyer.name;
  document.getElementById('resBuyerTax').innerText = inv.buyer.taxCode;
  const buyerBadge = document.getElementById('resBuyerStatusBadge');
  if (inv.buyer.validation.isValid) {
    buyerBadge.className = 'tax-status-badge valid';
    buyerBadge.innerText = '✓ Hợp Lệ';
  } else {
    buyerBadge.className = 'tax-status-badge invalid';
    buyerBadge.innerText = '✕ Cần Đối Soát';
  }

  // Items table
  const tbody = document.getElementById('invoiceItemsTbody');
  tbody.innerHTML = '';
  inv.items.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.lineNo}</td>
      <td><strong>${item.name}</strong></td>
      <td>${item.unit}</td>
      <td>${item.quantity}</td>
      <td class="font-mono">${item.unitPrice.toLocaleString('vi-VN')} ₫</td>
      <td class="font-mono">${item.amount.toLocaleString('vi-VN')} ₫</td>
      <td><span class="badge badge-info">${item.vatRate}</span></td>
    `;
    tbody.appendChild(tr);
  });

  // Financial summary
  document.getElementById('resSubtotal').innerText = inv.financialSummary.subtotalFormatted;
  document.getElementById('resVatAmount').innerText = inv.financialSummary.vatAmountFormatted;
  document.getElementById('resTotalPayment').innerText = inv.financialSummary.totalAmountFormatted;
  document.getElementById('resInWords').innerText = inv.financialSummary.amountInWords;

  // Audit banner
  const auditBanner = document.getElementById('auditBanner');
  const auditIcon = document.getElementById('auditIcon');
  const auditTitle = document.getElementById('auditTitle');
  const auditDesc = document.getElementById('auditDesc');
  const auditTag = document.getElementById('auditRiskTag');

  if (inv.audit.invoiceRiskLevel === 'CLEAN') {
    auditBanner.className = 'audit-banner';
    auditIcon.innerText = '🛡️';
    auditTitle.innerText = 'Hóa Đơn Toàn Vẹn & Khớp Số Học 100%';
    auditDesc.innerText = 'Tổng tiền trước thuế và tiền thuế GTGT hoàn toàn khớp với tổng cộng thanh toán. MST bên bán & bên mua đạt chuẩn Tổng Cục Thuế.';
    auditTag.className = 'audit-risk-tag';
    auditTag.innerText = 'CLEAN';
  } else {
    auditBanner.className = 'audit-banner warning';
    auditIcon.innerText = '⚠️';
    auditTitle.innerText = 'Cảnh Báo Rủi Ro Đối Soát';
    auditDesc.innerText = inv.audit.riskWarnings.join(' • ');
    auditTag.className = 'audit-risk-tag warning';
    auditTag.innerText = inv.audit.invoiceRiskLevel;
  }
}

// 6. Handle Tax Code Validation
async function handleValidateTaxCode() {
  const taxCode = document.getElementById('taxCodeSearchInput').value.trim();
  if (!taxCode) return alert('Vui lòng nhập mã số thuế.');

  const btn = document.getElementById('btnValidateTaxCode');
  btn.disabled = true;
  btn.innerText = 'Đang Tra Cứu...';

  try {
    const res = await fetch('/api/v1/verify-taxcode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'demo-free-key-guest'
      },
      body: JSON.stringify({ taxCode })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    const r = data.result;
    document.getElementById('taxDisplayCode').innerText = r.taxCode || taxCode;
    
    const badge = document.getElementById('taxVerdictBadge');
    if (r.isValid) {
      badge.className = 'tax-verdict-badge valid';
      badge.innerText = '✓ HỢP LỆ THEO CHUẨN TCT VIỆT NAM';
    } else {
      badge.className = 'tax-verdict-badge invalid';
      badge.innerText = '✕ KHÔNG HỢP LỆ (SAI CHECKSUM HOẶC ĐỘ DÀI)';
    }

    document.getElementById('taxEnterpriseName').innerText = r.enterpriseInfo ? r.enterpriseInfo.name : 'Chưa có thông tin định danh';
    document.getElementById('taxProvinceDisplay').innerText = `Mã ${r.provinceCode} - ${r.provinceName}`;
    document.getElementById('taxTypeDisplay').innerText = r.entityType;
    document.getElementById('taxAuthorityDisplay').innerText = r.enterpriseInfo ? r.enterpriseInfo.taxAuthority : 'Cục Thuế Tỉnh/Thành';

    const statusText = document.getElementById('taxChecksumStatusText');
    if (r.checksumVerified) {
      statusText.style.color = '#34d399';
      statusText.innerText = '✓ Chữ số kiểm tra (Modulo 11) hoàn toàn trùng khớp với chữ số cuối cùng của MST.';
    } else {
      statusText.style.color = '#f87171';
      statusText.innerText = '✕ Cảnh báo: Thuật toán Checksum Modulo 11 không khớp! Nghi vấn số giả mạo hoặc lỗi nhập liệu.';
    }

  } catch (err) {
    alert('Lỗi tra cứu: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = 'Tra Cứu & Xác Minh';
  }
}

// 7. VietQR Payment Flow
async function handleOpenPaymentModal(planId) {
  try {
    const modal = document.getElementById('vietQrModal');
    modal.classList.remove('hidden');
    document.getElementById('paidSuccessBox').classList.add('hidden');
    document.getElementById('qrSpinner').style.display = 'block';

    const res = await fetch('/api/payment/vietqr/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, clientEmail: 'user@vietnam.vn' })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    const order = data.order;
    currentPendingOrderId = order.orderId;

    document.getElementById('modalPlanTitle').innerText = `Thanh Toán ${order.planName}`;
    document.getElementById('modalAccountNo').innerText = order.accountNo;
    document.getElementById('modalAmount').innerText = order.amountVND.toLocaleString('vi-VN') + ' VNĐ';
    document.getElementById('modalMemo').innerText = order.memo;

    const qrImg = document.getElementById('modalQrImage');
    qrImg.onload = () => {
      document.getElementById('qrSpinner').style.display = 'none';
    };
    qrImg.src = order.qrImageUrl;

  } catch (err) {
    alert('Không thể tạo mã VietQR: ' + err.message);
  }
}

async function handleSimulatePayment() {
  if (!currentPendingOrderId) return;
  const btn = document.getElementById('btnSimulatePaid');
  btn.disabled = true;
  btn.innerText = 'Đang xác thực giao dịch qua Napas 24/7...';

  try {
    const res = await fetch('/api/payment/vietqr/confirm-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: currentPendingOrderId })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    document.getElementById('paidSuccessBox').classList.remove('hidden');
    document.getElementById('newApiKeyDisplay').innerText = data.apiKey;

    await fetchWalletMetrics();

  } catch (err) {
    alert('Lỗi xác thực đơn hàng: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = 'Mô Phỏng Chuyển Khoản Thành Công (Instant Activate)';
  }
}

// 8. x402 Simulator
async function handleSimulate402Challenge() {
  const terminal = document.getElementById('x402TerminalOutput');
  terminal.innerText = 'Đang gửi Request không kèm Key/Payment...\n';

  try {
    const res = await fetch('/api/v1/extract-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleId: 'fpt_retail' })
    });

    const headersObj = {};
    for (let [k, v] of res.headers.entries()) {
      if (k.toLowerCase().startsWith('x-')) headersObj[k] = v;
    }

    const body = await res.json();

    terminal.innerText = `[HTTP RESPONSE STATUS: ${res.status} Payment Required]\n\n` +
      `[HEADERS TRẢ VỀ CHO BOT]:\n` +
      JSON.stringify(headersObj, null, 2) + `\n\n` +
      `[BODY TRẢ VỀ (x402 Challenge)]:\n` +
      JSON.stringify(body, null, 2);

  } catch (err) {
    terminal.innerText = 'Lỗi: ' + err.message;
  }
}

async function handleSimulatePaymentProof() {
  const terminal = document.getElementById('x402TerminalOutput');
  const mockTx = '0x8f23' + Array.from({length: 60}, () => Math.floor(Math.random()*16).toString(16)).join('');
  terminal.innerText = `Bot đã ký giao dịch trên Base L2!\nGửi lại request kèm X-Payment-Proof: ${mockTx}...\n`;

  try {
    const res = await fetch('/api/v1/extract-invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Proof': mockTx,
        'X-Agent-Identity': 'Automaton-Child-Bot-Base'
      },
      body: JSON.stringify({ sampleId: 'fpt_retail' })
    });

    const body = await res.json();

    terminal.innerText = `[HTTP STATUS: ${res.status} OK - THANH TOÁN 0.005 USDC THÀNH CÔNG!]\n\n` +
      `[KẾT QUẢ ĐÃ MỞ KHÓA CHO BOT]:\n` +
      JSON.stringify(body, null, 2);

    await fetchWalletMetrics();

  } catch (err) {
    terminal.innerText = 'Lỗi: ' + err.message;
  }
}

// 9. Wallet & Admin Data
async function fetchWalletMetrics() {
  try {
    const res = await fetch('/api/wallet');
    const data = await res.json();
    if (data.status === 'success') {
      const w = data.wallet;
      document.getElementById('headerUsdcBalance').innerText = `${w.availableBalanceUSDC.toFixed(4)} USDC`;
      document.getElementById('headerVndBalance').innerText = `${w.totalEarnedVND.toLocaleString('vi-VN')} ₫`;

      const adminUsdc = document.getElementById('adminUsdcBalance');
      if (adminUsdc) adminUsdc.innerText = `${w.availableBalanceUSDC.toFixed(4)} USDC`;
      const adminVnd = document.getElementById('adminVndBalance');
      if (adminVnd) adminVnd.innerText = `${w.totalEarnedVND.toLocaleString('vi-VN')} ₫`;
      const adminReqs = document.getElementById('adminTotalRequests');
      if (adminReqs) adminReqs.innerText = `${w.totalRequests} lượt`;
      const adminPaid = document.getElementById('adminPaidRequests');
      if (adminPaid) adminPaid.innerText = `${w.paidRequestsX402} x402 • ${w.paidRequestsVietQR} VietQR`;
      const adminAddr = document.getElementById('adminUsdcAddress');
      if (adminAddr) adminAddr.innerText = `Ví Agent: ${w.address.substring(0, 8)}...${w.address.substring(36)}`;
    }
  } catch (err) {
    console.error('Không thể cập nhật số dư:', err);
  }
}

async function checkUserCredits() {
  const apiKey = document.getElementById('apiKeyInput')?.value.trim();
  if (!apiKey) return;

  try {
    const res = await fetch(`/api/user/${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const credits = data.user.credits;
      const display = document.getElementById('creditsCountDisplay');
      if (display) display.innerText = `${credits} lượt`;
    }
  } catch (e) {}
}

async function fetchAdminData() {
  await fetchWalletMetrics();
  try {
    const res = await fetch('/api/admin/transactions');
    const data = await res.json();
    if (data.status === 'success') {
      const tbody = document.getElementById('transactionsTbody');
      if (data.transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-dim">Chưa có giao dịch phát sinh.</td></tr>`;
        return;
      }
      tbody.innerHTML = '';
      data.transactions.forEach(tx => {
        const tr = document.createElement('tr');
        const formattedDate = new Date(tx.timestamp).toLocaleTimeString('vi-VN') + ' ' + new Date(tx.timestamp).toLocaleDateString('vi-VN');
        const amountDisplay = tx.currency === 'USDC' ? `+${tx.amount} USDC` : `+${tx.amount.toLocaleString('vi-VN')} ₫`;
        tr.innerHTML = `
          <td>${formattedDate}</td>
          <td><span class="badge ${tx.type.includes('WITHDRAW') ? 'badge-danger' : 'badge-success'}">${tx.type}</span></td>
          <td class="font-mono ${tx.currency === 'USDC' ? 'text-cyan' : 'text-emerald'}">${amountDisplay}</td>
          <td>${tx.network || 'Base L2'}</td>
          <td class="font-mono text-xs text-dim">${tx.proof ? tx.proof.substring(0, 16) + '...' : (tx.orderId || 'Direct')}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (e) {
    console.error('Lỗi tải giao dịch:', e);
  }
}

async function handleWithdraw() {
  const targetAddress = document.getElementById('withdrawTargetAddress').value.trim();
  const amountUSDC = parseFloat(document.getElementById('withdrawAmount').value);
  const adminKey = document.getElementById('withdrawAdminKey').value.trim();
  const feedback = document.getElementById('withdrawFeedback');

  if (!targetAddress || !amountUSDC || !adminKey) {
    alert('Vui lòng điền đủ địa chỉ ví, số tiền và mã bí mật Admin.');
    return;
  }

  const btn = document.getElementById('btnExecuteWithdraw');
  btn.disabled = true;
  btn.innerText = 'Đang Thực Hiện Lệnh Rút On-Chain...';

  try {
    const res = await fetch('/api/admin/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetAddress, amountUSDC, adminKey })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    feedback.className = 'withdraw-feedback success';
    feedback.classList.remove('hidden');
    feedback.innerHTML = `
      ✓ <strong>Rút thành công ${data.payout.withdrawnAmount} USDC!</strong><br>
      Tx Hash: <a href="${data.payout.explorerUrl}" target="_blank" class="link-glow font-mono">${data.payout.payoutTxHash}</a><br>
      Số dư khả dụng còn lại: ${data.payout.remainingBalance.toFixed(4)} USDC
    `;

    await fetchAdminData();

  } catch (err) {
    feedback.className = 'withdraw-feedback error';
    feedback.classList.remove('hidden');
    feedback.innerText = '✕ Thất bại: ' + err.message;
  } finally {
    btn.disabled = false;
    btn.innerText = 'Xác Nhận Rút USDC Về Ví';
  }
}
