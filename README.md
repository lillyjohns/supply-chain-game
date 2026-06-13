# 📦 Supply Chain Broker (เกมนายหน้าซัพพลายเชน)

เกมบอร์ดออนไลน์แบบหลายผู้เล่น (2-4 คน) ที่ผู้เล่นรับบทเป็นนายหน้าซื้อขายสินค้า

## 🎮 วิธีเล่น

### เป้าหมาย
มีเงินมากที่สุดเมื่อจบ 10 รอบ (สัปดาห์)

### สินค้า 5 สี
| สี | ราคาตลาด | Lead Time |
|---|---|---|
| 🔴 แดง | ฿100 | 1 สัปดาห์ |
| 🔵 น้ำเงิน | ฿150 | 1 สัปดาห์ |
| 🟢 เขียว | ฿200 | 2 สัปดาห์ |
| 🟡 เหลือง | ฿300 | 2 สัปดาห์ |
| 🟣 ม่วง | ฿500 | 3 สัปดาห์ |

### แต่ละรอบมี 3 เฟส:
1. **🎲 เหตุการณ์** — จับการ์ดเหตุการณ์สุ่ม (อาจดี/ร้าย/ปกติ)
2. **📋 เลือกออเดอร์** — ผลัดกันเลือกรับออเดอร์จากลูกค้า
3. **🛒 สั่งซื้อ** — สั่งซื้อสินค้าจากผู้ขาย (จ่ายทันที, สินค้ามาตาม lead time)
4. **📦 สรุปรอบ** — สินค้ามาถึง, ส่งมอบออเดอร์ที่ครบกำหนด, คิดค่าปรับ

### ส่วนลดจำนวนมาก
- 10+ ชิ้น = ลด 10%
- 20+ ชิ้น = ลด 15%  
- 50+ ชิ้น = ลด 25%

### ค่าปรับ
- ส่งช้า: 20% ของมูลค่าออเดอร์ต่อสัปดาห์
- ส่งไม่ครบ: 1.5x ราคาสินค้าที่ขาด
- คลังล้น (เกิน 50 หน่วย): ฿50 ต่อหน่วยที่เกิน

## 🚀 Quick Start (Local)

```bash
npm run install-all
npm run build
npm start
```

เปิด http://localhost:3000

## 🏗️ Tech Stack
- **Backend:** Node.js + Express + Socket.IO
- **Frontend:** React (Vite)
- **Deployment:** AWS EC2 + CloudFront

## 📁 Project Structure
```
├── server/          # Backend (Express + Socket.IO + Game logic)
├── client/          # Frontend (React + Vite)
├── public/          # Built frontend (served by Express)
├── infra/           # Deployment scripts
└── package.json
```

## ☁️ Deployment

```bash
./infra/deploy.sh
```

Deploys to AWS (ap-southeast-1):
- EC2 t3.small (Amazon Linux 2023)
- CloudFront with geo-restriction (TH, SG)

## 📜 License
MIT
