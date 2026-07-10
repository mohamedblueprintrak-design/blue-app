import { Building2, Compass, HardHat, FileCheck, Eye, ClipboardCheck, Users, Award, Zap, type LucideIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useInView } from "framer-motion";

// ==================== NAVIGATION ====================
export const NAV_LINKS = [
  { href: "/services", label: "خدماتنا", labelEn: "Services" },
  { href: "/#projects", label: "مشاريعنا", labelEn: "Projects" },
  { href: "/about", label: "من نحن", labelEn: "About" },
  { href: "/calculator", label: "حاسبة التكاليف", labelEn: "Calculator" },
];

// ==================== PROJECTS DATA ====================
export interface Project {
  id: number;
  title: string;
  titleEn: string;
  category: string;
  categoryEn: string;
  image: string;
  year: string;
  location: string;
  locationEn: string;
}

export const PROJECTS: Project[] = [
  {
    id: 1,
    title: "برج الأعمال التجاري",
    titleEn: "Commercial Business Tower",
    category: "تجاري",
    categoryEn: "Commercial",
    image: "/project-1.png",
    year: "2024",
    location: "رأس الخيمة",
    locationEn: "Ras Al Khaimah",
  },
  {
    id: 2,
    title: "فيلا الواحة السكنية",
    titleEn: "Oasis Residential Villa",
    category: "سكني",
    categoryEn: "Residential",
    image: "/project-2.png",
    year: "2024",
    location: "رأس الخيمة",
    locationEn: "Ras Al Khaimah",
  },
  {
    id: 3,
    title: "مشروع البناء المتكامل",
    titleEn: "Integrated Construction Project",
    category: "إنشائي",
    categoryEn: "Structural",
    image: "/project-3.png",
    year: "2023",
    location: "رأس الخيمة",
    locationEn: "Ras Al Khaimah",
  },
  {
    id: 4,
    title: "تصميم مكاتب عصرية",
    titleEn: "Modern Office Design",
    category: "تصميم داخلي",
    categoryEn: "Interior Design",
    image: "/project-4.png",
    year: "2024",
    location: "رأس الخيمة",
    locationEn: "Ras Al Khaimah",
  },
  {
    id: 5,
    title: "مجمع طبي متخصص",
    titleEn: "Specialized Medical Complex",
    category: "صحي",
    categoryEn: "Healthcare",
    image: "/project-5.png",
    year: "2023",
    location: "رأس الخيمة",
    locationEn: "Ras Al Khaimah",
  },
  {
    id: 6,
    title: "مركز تسوق حديث",
    titleEn: "Modern Shopping Center",
    category: "تجاري",
    categoryEn: "Commercial",
    image: "/project-6.png",
    year: "2024",
    location: "رأس الخيمة",
    locationEn: "Ras Al Khaimah",
  },
];

// ==================== SERVICES DATA ====================
export interface Service {
  icon: LucideIcon;
  title: string;
  titleEn: string;
  desc: string;
  descEn: string;
}

export const SERVICES: Service[] = [
  {
    icon: Building2,
    title: "التصميم المعماري",
    titleEn: "Architectural Design",
    desc: "تصاميم معمارية إبداعية ومبتكرة تتوافق مع أعلى معايير الجودة ومتطلبات بلدية رأس الخيمة",
    descEn: "Creative and innovative architectural designs that comply with the highest quality standards",
  },
  {
    icon: HardHat,
    title: "التصميم الإنشائي",
    titleEn: "Structural Design",
    desc: "تصاميم إنشائية دقيقة وموثوقة تضمن سلامة وأمان المباني",
    descEn: "Precise and reliable structural designs ensuring safety and security",
  },
  {
    icon: Zap,
    title: "التصميم الكهروميكانيكي",
    titleEn: "MEP Design",
    desc: "تصاميم متكاملة للأنظمة الكهربائية والميكانيكية والسباكة وأنظمة مكافحة الحريق",
    descEn: "Comprehensive designs for electrical, mechanical, plumbing, and fire fighting systems",
  },
  {
    icon: FileCheck,
    title: "رخص البلدية",
    titleEn: "Municipality Licenses",
    desc: "استخراج رخص البناء من بلدية رأس الخيمة بخطوات سلسة ومتابعة مستمرة",
    descEn: "Obtaining building permits from RAK Municipality with smooth procedures",
  },
  {
    icon: Eye,
    title: "الإشراف على التنفيذ",
    titleEn: "Construction Supervision",
    desc: "إشراف هندسي دقيق على جميع مراحل التنفيذ لضمان أعلى معايير الجودة",
    descEn: "Precise engineering supervision across all execution phases",
  },
  {
    icon: ClipboardCheck,
    title: "الاستشارات الهندسية",
    titleEn: "Engineering Consultation",
    desc: "تقديم استشارات هندسية متخصصة في جميع المجالات المدنية والمعمارية والإنشائية",
    descEn: "Specialized engineering consultation services in all civil, architectural, and structural fields",
  },
];

// ==================== STATS ====================
export interface StatItem {
  value: number;
  label: string;
  labelEn: string;
  icon: LucideIcon;
  suffix: string;
}

export const DEFAULT_STATS: StatItem[] = [
  { value: 250, label: "مشروع مكتمل", labelEn: "Projects Completed", icon: Building2, suffix: "+" },
  { value: 180, label: "عميل راضٍ", labelEn: "Satisfied Clients", icon: Users, suffix: "+" },
  { value: 6, label: "تخصصات هندسية", labelEn: "Engineering Disciplines", icon: Award, suffix: "" },
  { value: 50, label: "مشروع قيد التنفيذ", labelEn: "Ongoing Projects", icon: Compass, suffix: "+" },
];

// ==================== COUNTER HOOK ====================
export function useCounter(end: number, duration: number = 2000, startOnView: boolean = false) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const shouldStart = startOnView ? isInView : true;

  useEffect(() => {
    if (!shouldStart) return;
    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [shouldStart, end, duration]);

  return { count, ref };
}
