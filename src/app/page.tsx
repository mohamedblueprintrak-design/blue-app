import { Metadata } from 'next';
import LandingPageClient from '@/components/landing/landing-page-client';

export const metadata: Metadata = {
  title: 'BluePrint - نظام إدارة مكاتب الاستشارات الهندسية',
  description: 'نظام متكامل لإدارة مكاتب الاستشارات الهندسية في الإمارات',
};

export default function LandingPage() {
  return (
    <LandingPageClient />
  );
}
