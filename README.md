# TaxLens AI: Autonomous Micro-SaaS for Vietnamese VAT Invoices & Tax Sentinel

> **TaxLens AI** là một Micro-SaaS tự vận hành kinh doanh (Autonomous Micro-Tool) chuyên **Trích Xuất Hóa Đơn Điện Tử VAT chuẩn Thông tư 78/2021/TT-BTC**, **Kiểm Định Checksum Mã Số Thuế 63 Tỉnh Thành (Modulo 11)**, và tích hợp thanh toán tự động qua **VietQR (Napas 24/7)** cho người dùng cùng **giao thức x402 Micropayments trên Base L2** cho các AI Agent độc lập.

---

## ⚡ Các Tính Năng Cốt Lõi

1. **Bóc Tách & Đối Soát Hóa Đơn Điện Tử VAT (`POST /api/v1/extract-invoice`)**
   - Trích xuất: Ký hiệu, Số HĐ, Ngày lập, Bên bán, Bên mua, Danh mục mặt hàng, Đơn vị tính, Số lượng, Đơn giá, Thành tiền, Thuế suất VAT (0%, 5%, 8%, 10%).
   - Tự động kiểm tra tính toàn vẹn số học (Reconciliation Sentinel): Đối soát `Tiền hàng + Tiền thuế VAT == Tổng thanh toán`.
   - Cảnh báo hóa đơn lệch tiền hoặc có dấu hiệu chỉnh sửa giả mạo.

2. **Kiểm Định Thuật Toán Checksum Mã Số Thuế Modulo 11 (`POST /api/v1/verify-taxcode`)**
   - Kiểm tra chuẩn 10 chữ số (doanh nghiệp mẹ) và 13 chữ số (chi nhánh).
   - Giải mã mã tỉnh/thành phố đăng ký kinh doanh theo danh mục Tổng Cục Thuế.
   - Thuật toán Modulo 11 với bộ trọng số $[31, 29, 23, 19, 17, 13, 7, 5, 3]$ để xác định MST có hợp lệ hay bị nhập sai/làm giả.

3. **Xuất Định Dạng Kế Toán ERP Chuẩn (`POST /api/v1/export-accounting`)**
   - Xuất bút toán kế toán tự động (Nợ 1561/1331, Có 331) chuẩn import cho MISA SME, Fast Accounting, hoặc JSON.

4. **Giao Thức Thanh Toán Vi Mô Bot-to-Bot x402 trên Base L2**
   - Khi bot/agent gọi API mà không có tài khoản, server phản hồi `HTTP 402 Payment Required` kèm địa chỉ ví nhận USDC trên mạng Base.
   - Phí thanh toán vi mô: **0.005 USDC/request** (khoảng ~125 VNĐ).
   - Tự động ghi nhận doanh thu và cho phép chủ sở hữu rút tiền (Withdraw) về ví cá nhân bất kỳ lúc nào.

5. **Cổng Thanh Toán VietQR Napas 24/7 Cho Người Dùng**
   - Sinh mã QR động kèm nội dung chuyển khoản độc nhất.
   - Kích hoạt lượt quét tức thì và cấp phát API Key tự động.

6. **Danh Bạ Tự Hành Chuẩn ERC-8004**
   - Manifest chuẩn máy đọc tại `/.well-known/erc-8004.json` giúp mạng lưới AI Agent (như Automaton, Swarm) tự tìm thấy và mua dịch vụ.

---

## 💰 Bảng Giá Dịch Vụ (Monetization Matrix)

| Gói | Giá | Lượt Gọi / Quyền Lợi | Đối Tượng Mục Tiêu |
| :--- | :--- | :--- | :--- |
| **x402 Pay-Per-Call** | **0.005 USDC** / req | Thanh toán vi mô tức thì trên Base L2 | Autonomous AI Agents & Bots |
| **Gói Starter** | **29.000 ₫** | 50 lượt trích xuất + kiểm tra MST | Freelancer, Cửa hàng kinh doanh nhỏ |
| **Gói Pro Accountant** | **99.000 ₫** | 300 lượt trích xuất + cấp API Key | Kế toán viên, Doanh nghiệp vừa |
| **Gói Enterprise** | **299.000 ₫** | 1,500 lượt trích xuất + Webhook sync | Doanh nghiệp lớn, Hệ thống RAG |

---

## 🚀 Khởi Động & Kiểm Thử

### 1. Cài đặt và chạy Server
```bash
npm install
node server.js
```
Server chạy tại: `http://localhost:3001`

### 2. Chạy Bộ Kiểm Thử Tự Động (100% Pass)
```bash
npm test
```

---

## 🔌 Hướng Dẫn Sử Dụng API

### 1. Bóc Tách Hóa Đơn (Dành cho Lập trình viên)
```bash
curl -X POST http://localhost:3001/api/v1/extract-invoice \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo-free-key-guest" \
  -d '{"sampleId": "fpt_retail"}'
```

### 2. Tra Cứu & Xác Thực Mã Số Thuế
```bash
curl -X POST http://localhost:3001/api/v1/verify-taxcode \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo-free-key-guest" \
  -d '{"taxCode": "0303490096"}'
```

### 3. Gọi Dành Cho AI Agent (x402 Micropayments)
```bash
# Bước 1: Gọi không có key để nhận HTTP 402 challenge
curl -i -X POST http://localhost:3001/api/v1/extract-invoice \
  -H "Content-Type: application/json" \
  -d '{"sampleId": "viettel_telecom"}'

# Bước 2: Bot chuyển 0.005 USDC trên Base và gửi lại với proof
curl -X POST http://localhost:3001/api/v1/extract-invoice \
  -H "Content-Type: application/json" \
  -H "X-Payment-Proof: 0x8f23...a7b4" \
  -H "X-Agent-Identity: MyAutonomousBot" \
  -d '{"sampleId": "viettel_telecom"}'
```

### 4. Rút Tiền Doanh Thu Về Ví Cá Nhân (Admin Payout)
```bash
curl -X POST http://localhost:3001/api/admin/withdraw \
  -H "Content-Type: application/json" \
  -d '{
    "targetAddress": "0xYourPersonalBaseWalletAddress",
    "amountUSDC": 1.0,
    "adminKey": "taxlens-admin-sec-2026"
  }'
```
