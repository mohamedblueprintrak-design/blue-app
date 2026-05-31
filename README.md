# <div align="center">
  <img src="public/logo.png" alt="BluePrint" width="80" height="80" style="border-radius: 16px; margin-bottom: 8px;" />
  <br/>
  <strong>BluePrint Engineering Consultancy</strong>
  <br/>
  <span>نظام إدارة مكاتب الاستشارات الهندسية</span>
  <br/>
  <em>Engineering Consultancy Management System</em>
</div>

<br/>

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)
![Prisma](https://img.shields.io/badge/Prisma-6-2d3748?logo=prisma)
![License](https://img.shields.io/badge/License-MIT-green)

نظام متكامل لإدارة مكاتب الاستشارات الهندسية في الإمارات العربية المتحدة. يدعم اللغة العربية (RTL) والإنجليزية مع 9 أدوار مستخدمين و 62 صفحة تغطي كل المجالات.

A comprehensive management system for engineering consultancy offices in the UAE. Supports Arabic (RTL) and English with 9 user roles and 62 pages covering all business domains.

---

## 🏢 About BluePrint

**BluePrint Engineering Consultancy** is a professional engineering consultancy office based in Ras Al Khaimah, UAE. Founded in 2025, we specialize in:

- **Architectural Design** - Creative and innovative architectural designs
- **Structural Design** - Precise and reliable structural engineering
- **MEP Design** - Electrical, mechanical, plumbing, and fire fighting systems
- **Municipality Permits** - Building permits from RAK Municipality
- **Construction Supervision** - Engineering supervision across all phases
- **Engineering Consultation** - Specialized consultation services

### 👥 Our Team

| Name | Position | Specialty |
|---|---|---|
| م. جراح الطير | المدير العام ومؤسس المكتب | هندسة مدنية - إدارة مشاريع |
| دينا الجاعلي | مديرة قسم التصميم المعماري | تصميم معماري |
| م. شريف صبري | مدير قسم التصميم الإنشائي | هندسة إنشائية |

---

## ✨ Features

### 📊 Dashboard
- KPI stat cards with trends & sparklines
- Revenue area chart (Recharts)
- Department progress bars
- Project Gantt timeline with milestones
- Team performance widget
- System status monitor
- Project health scores

### 🏢 Projects Management
- Project listing with health indicators, sparklines, grid/table view
- Project detail workspace with 11 tabs (Overview, Tasks, Financial, Schedule, etc.)
- SVG progress rings, RACI matrix, Gantt bars
- Project comparison tool (2-3 projects)
- Municipality approval tracking

### ✅ Tasks (Kanban)
- 5-column Kanban board with drag & drop
- Priority indicators, SLA countdown, subtask counts
- Bulk actions (status change, priority, delete)
- Filter chips (All/Urgent/Overdue/Governmental)

### 💰 Financial Module
- **Invoices**: Line items, 5% VAT auto-calc, payment status donut chart, CSV export
- **Payments**: Approval workflow, timeline chart
- **Proposals**: Win probability bars, conversion tracking
- **Bids**: Deadline countdown, competitor comparison
- **Budgets**: Hierarchical tracking, variance indicators, utilization bars
- **Contracts**: Timeline visual, amendment tracking

### 🏗️ Site Management
- Site visits with weather badges & map placeholders
- Defects tracking with severity distribution
- Site diary with timeline
- RFI with SLA countdown
- Submittals with revision tracking
- Change orders with financial impact

### 👥 HR Module
- Employee management (table/grid views, skill tags, avatars)
- Attendance with weekly heatmap
- Leave management with balance cards & calendar strip
- Workload dashboard with department grouping

### 📦 Procurement
- Suppliers with star ratings & performance indicators
- Inventory with stock level bars & low-stock warnings
- Purchase orders with status tracking
- Equipment management

### 📄 Documents & Knowledge Base
- File management with type-colored icons
- Folder tree, sort controls, storage usage
- Knowledge base with categories & reading time
- CSV export on reports

### 📅 Calendar & Meetings
- Calendar with 6 event types
- Meeting management with weekly schedule strip
- Pulsing indicators for upcoming meetings
- Attendee avatars

### 🤖 AI Assistant
- Chat interface with suggestions
- Markdown formatting
- Voice input support
- Export chat as .txt
- Conversation history saved to database

### 🔔 Notifications
- 5 notification types with priority borders
- Mark all read, unread count badges
- Relative time formatting (Arabic/English)

### ⚙️ Settings & Admin
- User management with 9 role types
- System health monitor
- Theme customization (light/dark)
- Keyboard shortcuts overlay (? key)
- 2FA Authentication (TOTP)

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16 | App Router, API Routes |
| **React** | 19 | UI Framework |
| **TypeScript** | 5 | Type Safety |
| **Tailwind CSS** | 4 | Styling (RTL-first) |
| **shadcn/ui** | Latest | Component Library |
| **Prisma** | 6 | ORM (SQLite/PostgreSQL) |
| **NextAuth.js** | 4 | Authentication |
| **Zustand** | 5 | Client State |
| **TanStack Query** | 5 | Server State |
| **Recharts** | 2 | Data Visualization |
| **Framer Motion** | 12 | Animations |
| **Lucide React** | Latest | Icons |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (or Bun)
- Git

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/mohamedblueprintrak-design/blue.git
cd blue

# 2. Install dependencies
npm install
# or: bun install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and set NEXTAUTH_SECRET (run: openssl rand -base64 32)

# 4. Initialize database
npx prisma db push
npx prisma db seed

# 5. Start development server
npm run dev
# or: bun run dev

# 6. Open http://localhost:3000
```

### Test Accounts

| Email | Password | Role | الدور |
|---|---|---|---|
| admin@blueprint.ae | Admin@BP2024! | Admin | المدير العام |
| pm@blueprint.ae | Admin@BP2024! | Project Manager | مدير مشاريع |
| eng@blueprint.ae | Admin@BP2024! | Engineer | مهندس |
| acc@blueprint.ae | Admin@BP2024! | Accountant | محاسب |
| hr@blueprint.ae | Admin@BP2024! | HR | موارد بشرية |
| sec@blueprint.ae | Admin@BP2024! | Secretary | سكرتير |

---

## 🎯 9 User Roles

1. **المدير العام** (Admin) - Full access
2. **المدير** (Manager) - Department management
3. **مدير مشاريع** (Project Manager) - Projects & tasks
4. **مهندس** (Engineer) - Technical work
5. **مساح** (Draftsman) - Drawings & plans
6. **محاسب** (Accountant) - Financial module
7. **موارد بشرية** (HR) - HR module
8. **سكرتير** (Secretary) - Documents & meetings
9. **مشاهد** (Viewer) - Read-only access

---

## 📁 Project Structure

```
blue/
├── prisma/
│   ├── schema.prisma       # 86 database models
│   └── seed.ts             # Demo data
├── src/
│   ├── app/
│   │   ├── page.tsx        # Landing page
│   │   ├── dashboard/      # Dashboard pages
│   │   ├── login/          # Login page
│   │   ├── about/          # About page
│   │   ├── services/       # Services page
│   │   ├── quote/          # Quote request page
│   │   ├── calculator/     # Cost calculator
│   │   └── api/            # 160+ API routes
│   ├── components/
│   │   ├── pages/          # 62 page components
│   │   ├── layout/         # App layout, sidebar, breadcrumbs
│   │   └── ui/             # 48 shadcn/ui components
│   ├── hooks/              # Custom React hooks
│   ├── lib/
│   │   ├── i18n.ts         # Bilingual keys
│   │   ├── permissions.ts  # 9-role permission matrix
│   │   ├── db.ts           # Prisma client
│   │   └── export-utils.ts # CSV export utility
│   └── styles/globals.css  # Tailwind + custom CSS
├── db/                     # SQLite database
├── public/                 # Static assets
└── .env.example            # Environment template
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `?` | Show shortcuts overlay |
| `Ctrl+K` | Search command palette |
| `Ctrl+N` | New project |
| `Ctrl+T` | New task |
| `Ctrl+I` | New invoice |
| `Escape` | Close dialog/palette |
| `1-6` | Navigate: Dashboard/Projects/Tasks/Clients/Invoices/Calendar |

---

## 📊 Project Statistics

| Metric | Count |
|---|---|
| Total Lines of Code | 159,481 |
| Page Components | 62 |
| API Routes | 160+ |
| UI Components | 48 |
| Database Models | 86 |
| Translation Keys | 404+ |
| Keyboard Shortcuts | 12 |
| Data Charts | 6 |

---

## 🔄 Switch to PostgreSQL (Production)

```bash
# 1. Update .env
DATABASE_URL="postgresql://user:password@localhost:5432/blueprint"

# 2. Update prisma/schema.prisma
# Change provider from "sqlite" to "postgresql"

# 3. Push schema
npx prisma db push

# 4. Seed data
npx prisma db seed
```

---

## 📞 Contact

- **Phone**: +971 50 161 1234
- **Email**: info.blueprintrak@gmail.com
- **Location**: Ras Al Khaimah, UAE

---

## 📝 License

MIT License - Free for personal and commercial use.

---

## 🇦🇪 Built for UAE Engineering Consultancies

Designed specifically for the UAE market with:
- Arabic RTL-first design
- UAE municipality tracking (Ras Al Khaimah)
- AED currency support
- Governmental project SLA tracking
- Multi-role access control
- Video background landing page
- Professional dark theme UI
