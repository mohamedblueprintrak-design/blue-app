import { Metadata } from 'next';
import LandingPageClient from '@/components/landing/landing-page-client';

// ISR: Revalidate the landing page every hour (3600 seconds).
// The landing page content (text, images) is mostly static, but public/stats
// API is called client-side. ISR lets Next.js cache the HTML and serve it
// from the edge, regenerating in the background every hour.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'BluePrint - نظام إدارة مكاتب الاستشارات الهندسية',
  description: 'نظام متكامل لإدارة مكاتب الاستشارات الهندسية في الإمارات',
};

export default function LandingPage() {
  return (
    <LandingPageClient />
  );
}
