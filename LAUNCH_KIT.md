# TaxLens AI: Bộ Tài Liệu Đăng Bán & Phân Phối (Distribution Kit)

Bộ kịch bản soạn sẵn để bạn đăng bán ngay lập tức trên các kênh mạng xã hội, diễn đàn kế toán và cộng đồng lập trình viên nhằm thu hút khách hàng và tạo dòng tiền đầu tiên.

---

## 1. Kênh Cộng Đồng Kế Toán & Doanh Nghiệp Việt Nam (Facebook Groups / Zalo)
- **Nơi đăng:** Các nhóm Facebook "Cộng Đồng Kế Toán Việt Nam", "Dân Kế Toán", "Hội Kế Toán Doanh Nghiệp SME", "Webketoan".
- **Tiêu đề:** `Công cụ miễn phí: Tự động bóc tách hóa đơn điện tử VAT chuẩn TT78 & kiểm tra MST tránh rủi ro hóa đơn ma`
- **Nội dung:**
```markdown
Chào các anh/chị em làm kế toán và chủ doanh nghiệp!

Hàng tháng khi nhận hàng trăm hóa đơn điện tử (PDF/XML/ảnh), việc ngồi gõ tay lại mã số thuế, kiểm tra xem công ty đó có thật không, tính lại tiền thuế 8% hay 10% và nhập liệu vào phần mềm MISA/Fast cực kỳ mất thời gian và dễ nhầm số.

Mình vừa hoàn thiện công cụ nhỏ **TaxLens AI** giải quyết nhanh bài toán này:
✅ Bóc tách tức thì Số HĐ, Ký hiệu, Ngày lập, Bên bán, Bên mua và Bảng chi tiết hàng hóa.
✅ Tự động kiểm tra thuật toán Checksum Modulo 11 của Tổng Cục Thuế: Phát hiện ngay nếu gõ nhầm số hoặc hóa đơn có dấu hiệu làm giả.
✅ Cảnh báo đối soát lệch tiền: Kiểm tra số học (Tiền hàng + Thuế VAT == Tổng thanh toán).
✅ 1-Click xuất bút toán kế toán MISA SME (Nợ 1561/1331, Có 331).

Tặng mọi người dùng thử miễn phí trực tiếp trên Web:
👉 Link trải nghiệm: http://localhost:3001 (Hoặc link deploy public)
Thanh toán nạp lượt siêu tiện qua VietQR Napas 24/7 chỉ từ 29k/50 hóa đơn.

Mọi người test thử và cho mình xin ý kiến đóng góp nhé!
```

---

## 2. Kênh Lập Trình Viên & Indie Hackers Việt Nam (J2TEAM, Viblo, Voz)
- **Tiêu đề:** `Micro-SaaS đầu tiên tại VN tích hợp song song VietQR và x402 Micropayments trên Base L2 cho AI Bot`
- **Nội dung:**
```markdown
Hi anh em dev,

Mình vừa build một Micro-SaaS tự hành mang tên **TaxLens AI** để thử nghiệm mô hình kinh tế AI Agent tự kiếm tiền (Agent Commerce Engine):
1. **Bài toán giải quyết:** Bóc tách hóa đơn điện tử TT78, validate checksum MST 63 tỉnh và format bút toán ERP.
2. **Kênh thanh toán cho người:** VietQR Napas 24/7 sinh QR động, webhook tự động cấp API Key chỉ sau 1 giây.
3. **Kênh cho AI Agent (M2M):** Hỗ trợ chuẩn HTTP 402 (x402) trên mạng Base L2. Bot khác chỉ cần gửi request, nhận mã 402 với giá 0.005 USDC/req, thanh toán on-chain rồi unlock API mà không cần tạo account.
4. **Agent Discovery:** Triển khai manifest chuẩn ERC-8004 tại `/.well-known/erc-8004.json`.

Source code và demo chạy nội bộ:
- Cổng web: http://localhost:3001
- API Doc: `POST /api/v1/extract-invoice` và `POST /api/v1/verify-taxcode`

Anh em quan tâm đến mảng Autonomous Agent Commerce ghé xem thử nhé!
```

---

## 3. Show HN (Hacker News) & Product Hunt
- **Tiêu đề:** `Show HN: TaxLens AI – Vietnamese VAT invoice parser with x402 Base micropayments`
- **Nội dung:**
```markdown
Hi HN,

Processing electronic VAT invoices in Southeast Asia is notoriously fragmented. Circular 78 in Vietnam mandates strict invoice structures, but verifying tax codes (checksum Modulo 11) and reconciling subtotal + VAT amounts often breaks automated accounting workflows.

I built TaxLens AI as a lightweight Micro-SaaS:
- Extracts items, tax rates (0/5/8/10%), and buyer/seller identities.
- Verifies official tax checksum algorithms against Vietnam Tax Authority standards.
- Supports dual settlement: VietQR for local users, and x402 micropayments (0.005 USDC on Base L2) for autonomous agents and bots.
- ERC-8004 autonomous discovery manifest built-in.

Live demo & API: http://localhost:3001
ERC-8004 Manifest: http://localhost:3001/.well-known/erc-8004.json

Would love your feedback on the parser heuristics and machine-to-machine payment UX!
```

---

## 4. X (Twitter) & Farcaster (Base Community)
```text
🚀 Just launched TaxLens AI: The first VAT invoice & tax sentinel micro-SaaS monetized with x402 micropayments on @base + VietQR for humans!

⚡ Auto-validates Modulo 11 tax checksums & TT78 e-invoices
🤖 0.005 USDC/call settled via HTTP 402 on Base
📜 ERC-8004 agent discovery ready

Test it out: http://localhost:3001
```
