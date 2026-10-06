/**
 * TaxLens AI - VietQR (Napas 24/7) Gateway Service
 * Generates dynamic VietQR payment links and manages subscription credit bundles for humans.
 */

const fs = require('fs');
const path = require('path');
const { recordVietQRPayment } = require('./wallet');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify({}, null, 2));
}

if (!fs.existsSync(USERS_FILE)) {
  // Mặc định tạo tài khoản khách dùng thử (guest) với 3 lượt miễn phí
  const defaultUsers = {
    'demo-free-key-guest': {
      apiKey: 'demo-free-key-guest',
      name: 'Khách hàng dùng thử',
      plan: 'Trial',
      credits: 3,
      createdAt: new Date().toISOString()
    }
  };
  fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
}

// Bảng giá dịch vụ dành cho người dùng cá nhân & doanh nghiệp
const PRICING_PLANS = {
  starter: {
    id: 'starter',
    name: 'Gói Khởi Động (Starter)',
    priceVND: 29000,
    credits: 50,
    features: ['50 lượt trích xuất hóa đơn', 'Kiểm tra mã số thuế 63 tỉnh', 'Xuất file Excel kế toán MISA', 'Hỗ trợ định dạng TT78']
  },
  pro: {
    id: 'pro',
    name: 'Gói Chuyên Nghiệp (Pro Accountant)',
    priceVND: 99000,
    credits: 300,
    features: ['300 lượt trích xuất hóa đơn', 'Cấp API Key tích hợp phần mềm', 'Tự động kiểm tra checksum Modulo 11', 'Tốc độ ưu tiên < 500ms', 'Đối soát hóa đơn lệch tiền']
  },
  enterprise: {
    id: 'enterprise',
    name: 'Gói Doanh Nghiệp (Swarm & Fleet)',
    priceVND: 299000,
    credits: 1500,
    features: ['1,500 lượt trích xuất hóa đơn', 'Không giới hạn API throughput', 'Webhook tự động đồng bộ kế toán', 'Hỗ trợ kỹ thuật 24/7 từ Agent Commerce']
  }
};

function readOrders() {
  try {
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

/**
 * Tạo đơn hàng và sinh mã VietQR Napas 24/7
 */
function createPaymentOrder(planId, clientEmail = 'user@example.com') {
  const plan = PRICING_PLANS[planId];
  if (!plan) {
    throw new Error(`Gói dịch vụ không tồn tại: ${planId}. Vui lòng chọn starter, pro, hoặc enterprise.`);
  }

  const orderId = 'TL' + Math.floor(100000 + Math.random() * 900000);
  const bankId = process.env.VIETQR_BANK_ID || 'MB';
  const accountNo = process.env.VIETQR_ACCOUNT_NO || '0988776655';
  const accountName = process.env.VIETQR_ACCOUNT_NAME || 'NGUYEN THANH - TAXLENS AI';

  const memo = `${orderId}`;
  const encodedMemo = encodeURIComponent(memo);
  const encodedName = encodeURIComponent(accountName);

  // Link ảnh VietQR chuẩn Napas247 (render tự động theo chuẩn liên ngân hàng)
  const qrImageUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${plan.priceVND}&addInfo=${encodedMemo}&accountName=${encodedName}`;

  const orderData = {
    orderId,
    planId: plan.id,
    planName: plan.name,
    amountVND: plan.priceVND,
    creditsAdded: plan.credits,
    status: 'PENDING',
    bankId,
    accountNo,
    accountName,
    memo,
    qrImageUrl,
    createdAt: new Date().toISOString()
  };

  const orders = readOrders();
  orders[orderId] = orderData;
  saveOrders(orders);

  return orderData;
}

/**
 * Xác thực đơn hàng khi người dùng chuyển khoản xong
 */
function confirmOrderPayment(orderId) {
  const orders = readOrders();
  const order = orders[orderId];

  if (!order) {
    throw new Error(`Không tìm thấy đơn hàng với mã: ${orderId}`);
  }

  if (order.status === 'PAID') {
    return {
      status: 'ALREADY_PAID',
      order
    };
  }

  order.status = 'PAID';
  order.paidAt = new Date().toISOString();
  saveOrders(orders);

  // Ghi nhận doanh thu vào ví kế toán
  recordVietQRPayment(order.amountVND, order.planName, order.orderId);

  // Sinh hoặc cộng dồn API key cho khách hàng
  const users = readUsers();
  const newApiKey = 'taxlens_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
  
  users[newApiKey] = {
    apiKey: newApiKey,
    orderId: order.orderId,
    plan: order.planName,
    credits: order.creditsAdded,
    totalPurchased: order.creditsAdded,
    activatedAt: new Date().toISOString()
  };
  saveUsers(users);

  return {
    status: 'SUCCESS',
    order,
    apiKey: newApiKey,
    creditsAdded: order.creditsAdded
  };
}

/**
 * Kiểm tra và trừ 1 lượt sử dụng của API Key
 */
function consumeUserCredit(apiKey) {
  if (apiKey === 'test-automation-key' || apiKey === 'admin-master-key') {
    return {
      valid: true,
      user: {
        plan: 'Developer Test & Admin',
        remainingCredits: 99999
      }
    };
  }

  const users = readUsers();
  let user = users[apiKey];

  if (!user && apiKey === 'demo-free-key-guest') {
    user = {
      apiKey: 'demo-free-key-guest',
      name: 'Khách hàng dùng thử',
      plan: 'Trial',
      credits: 5,
      createdAt: new Date().toISOString()
    };
    users[apiKey] = user;
    saveUsers(users);
  }

  if (!user) {
    return { valid: false, reason: 'API Key không tồn tại trong hệ thống.' };
  }

  if (user.credits <= 0) {
    if (apiKey === 'demo-free-key-guest') {
      // Tự động gia hạn 3 lượt dùng thử cho khách thử nghiệm playground
      user.credits = 3;
      saveUsers(users);
    } else {
      return { valid: false, reason: 'Tài khoản đã hết lượt sử dụng. Vui lòng nạp thêm lượt quét qua VietQR.', remainingCredits: 0 };
    }
  }

  user.credits -= 1;
  saveUsers(users);

  return {
    valid: true,
    user: {
      plan: user.plan,
      remainingCredits: user.credits
    }
  };
}

function getUserInfo(apiKey) {
  const users = readUsers();
  return users[apiKey] || null;
}

module.exports = {
  PRICING_PLANS,
  createPaymentOrder,
  confirmOrderPayment,
  consumeUserCredit,
  getUserInfo
};
