"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "./data";

export function ProjectCard({
  project,
  index,
  language,
}: {
  project: Project;
  index: number;
  language: "ar" | "en";
}) {
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  return (
    <Link href="/dashboard#projects" className="block">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ delay: index * 0.1, duration: 0.6, ease: "easeOut" as const }}
        className="group relative overflow-hidden rounded-2xl cursor-pointer"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={project.image}
            alt={t(project.title, project.titleEn)}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1D3A]/90 via-[#0B1D3A]/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
          
          <div className="absolute top-4 start-4">
            <span className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-[#0B1D3A]">
              {t(project.category, project.categoryEn)}
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            whileHover={{ opacity: 1, scale: 1 }}
            className="absolute top-4 end-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            <ArrowUpRight className="w-5 h-5 text-[#0B1D3A]" />
          </motion.div>
        </div>

        <div className="absolute bottom-0 inset-x-0 p-6">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 + 0.2 }}
          >
            <h3 className="text-xl font-bold text-white mb-2">
              {t(project.title, project.titleEn)}
            </h3>
            <div className="flex items-center gap-3 text-white/70 text-sm">
              <span>{project.year}</span>
              <span>•</span>
              <span>{t(project.location, project.locationEn)}</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </Link>
  );
}
