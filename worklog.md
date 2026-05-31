# Worklog — Fix React Component Security and UX Issues

**Date:** 2025-03-04
**Task ID:** 10

---

## 1. XSS — dangerouslySetInnerHTML in layout.tsx

**File:** `src/app/layout.tsx` (line 65–73)

**Finding:** A single `dangerouslySetInnerHTML` usage for an inline `<script>` that reads a known localStorage key (`blueprint-lang`) and sets `document.documentElement.lang` / `dir` before React hydrates. This prevents an RTL flash on page load.

**Action:** No code replacement needed — the content is a hardcoded IIFE with zero user-supplied input. Added a detailed safety comment explaining why this usage is not an XSS vector.

**Note:** A second `dangerouslySetInnerHTML` exists in `src/components/ui/chart.tsx` (line 83) for chart SVG rendering — that is a standard recharts pattern and was left untouched.

---

## 2. Real Emails Exposed Client-Side

Replaced all real email addresses in client components with placeholders or environment-variable-driven fallbacks:

| File | Before | After |
|------|--------|-------|
| `src/components/auth/login-page.tsx` | `admin@blueprint.ae`, `pm@blueprint.ae`, etc. (12 roles) | `admin@demo.blueprint.app`, `pm@demo.blueprint.app`, etc. |
| `src/components/layout/public-footer.tsx` | `info.blueprintrak@gmail.com` | `process.env.NEXT_PUBLIC_CONTACT_EMAIL \|\| 'contact@blueprint.app'` |
| `src/components/common/error-boundary.tsx` | `support@blueprint-app.com` (mailto) | `process.env.NEXT_PUBLIC_SUPPORT_EMAIL \|\| 'support@blueprint.app'` (mailto) |
| `src/components/pages/activity-log.tsx` | `ahmed@blueprint.ae`, `sara@blueprint.ae`, etc. (7 unique emails in mock data) | `@example.com` equivalents |
| `src/components/pages/help.tsx` | `support@blueprint.ae` (FAQ answers + contact button) | Removed from FAQ text; contact button uses `process.env.NEXT_PUBLIC_SUPPORT_EMAIL \|\| 'support@blueprint.app'` |
| `src/components/pages/settings/company-tab.tsx` | `info.blueprintrak@gmail.com` (placeholder) | `info@example.com` |
| `src/components/pages/admin/user-form.tsx` | `user@blueprint.ae` (placeholder) | `user@example.com` |

**Env vars to set (optional):**
- `NEXT_PUBLIC_CONTACT_EMAIL` — footer contact email
- `NEXT_PUBLIC_SUPPORT_EMAIL` — support email (error boundary, help page)

---

## 3. VAT Hardcoded Values

**Created:** `src/lib/constants.ts`
```ts
export const TAX_RATE: number = parseFloat(process.env.NEXT_PUBLIC_TAX_RATE || '0.05');
```

**Replaced hardcoded `0.05` in client components:**

| File | Lines Changed |
|------|---------------|
| `src/components/pages/invoices.tsx` | 3 occurrences (create mutation, update mutation, calcTax) → `TAX_RATE` |
| `src/components/pages/proposals.tsx` | 1 occurrence (calcTax) → `TAX_RATE` |
| `src/components/pages/features-hub.tsx` | 1 occurrence (BOQ vat calc) → `TAX_RATE` |

**Not modified (server-side, already using env):**
- `src/app/api/invoices/route.ts` — already uses `process.env.TAX_RATE`
- `src/app/api/invoices/[id]/route.ts` — already uses `process.env.TAX_RATE`
- `src/app/api/proposals/route.ts` — server-side, not in scope
- `src/app/api/proposals/[id]/route.ts` — server-side, not in scope

**Env var to set (optional):** `NEXT_PUBLIC_TAX_RATE` — defaults to `'0.05'` (UAE 5% VAT)

---

## 4. RTL Physical CSS Properties → Logical Properties

Replaced physical left/right CSS with logical start/end equivalents in key layout files:

| File | Before | After |
|------|--------|-------|
| `src/components/layout/public-footer.tsx` | `fixed bottom-6 left-6` (WhatsApp button) | `fixed bottom-6 start-6` |
| `src/components/layout/mobile-bottom-nav.tsx` | `fixed bottom-0 left-0 right-0` | `fixed bottom-0 start-0 end-0` |
| `src/components/layout/mobile-bottom-nav.tsx` | `absolute -top-1.5 -right-2` (notification badge) | `absolute -top-1.5 -end-2` |
| `src/components/pages/activity-log.tsx` | `isAr ? "right-[-16px]" : "left-[-16px]"` (timeline line) | `start-[-16px]` |
| `src/components/pages/activity-log.tsx` | `isAr ? "right-[-20px]" : "left-[-20px]"` (timeline dot) | `start-[-20px]` |
| `src/components/pages/help.tsx` | `isAr ? "right-3" : "left-3"` (search icon) | `start-3` |
| `src/components/pages/help.tsx` | `isAr ? "ps-4 pe-12" : "ps-12 pe-4"` (search input padding) | `ps-12 pe-4` (fixed RTL bug — icon is at start, so padding-start needs to be larger) |

**Not modified (intentional physical CSS):**
- `mobile-bottom-nav.tsx` indicator bar `style={{ left: ... }}` — uses `getBoundingClientRect()` pixel positions, which are always physical. Logical `inset-inline-start` would not work correctly here.

**Files already using logical properties (no changes needed):**
- `src/app/layout.tsx` — uses `dir="rtl"` attribute
- `src/components/auth/login-page.tsx` — already uses `ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`

---

## Summary

| Category | Files Modified | Issues Fixed |
|----------|---------------|-------------|
| XSS/dangerouslySetInnerHTML | 1 | Added safety comment |
| Email exposure | 7 | Replaced all real emails with env vars or placeholders |
| VAT hardcoded | 4 (1 new + 3 modified) | Centralized `TAX_RATE` constant |
| RTL physical CSS | 4 | Replaced left/right with start/end logical properties |
| **Total** | **11 files** | **4 categories addressed** |
