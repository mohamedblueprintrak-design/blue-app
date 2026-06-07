import { TimesheetsPage } from '@/components/pages/timesheets';

export default function Page() {
  return <TimesheetsPage language="ar" />;
}

// Force dynamic rendering — this page uses React Query which requires
// a QueryClientProvider (available in the dashboard layout) and
// cannot be prerendered statically.
export const dynamic = 'force-dynamic';
