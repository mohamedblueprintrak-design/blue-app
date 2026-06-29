/**
 * Shared type definitions for dynamically-imported jsPDF and autoTable modules.
 *
 * These modules are loaded via dynamic `import()` for server-side-only PDF generation.
 * Using concrete types here avoids `any` throughout the PDF generator files.
 */

import type { jsPDF } from 'jspdf';

/** The constructor for jsPDF instances (the default export of the jspdf module) */
export type JsPDFConstructor = typeof jsPDF;

/** The autoTable plugin function (the default export of jspdf-autotable) */
// Uses the exact type from the jspdf-autotable package instead of `any`.
// This gives us full type checking on autoTable() calls.
export type AutoTablePlugin = typeof import('jspdf-autotable').default;

/** Cached jsPDF modules from dynamic import */
export interface JsPdfCache {
  jsPDF: JsPDFConstructor;
  autoTable: AutoTablePlugin;
}

/**
 * jsPDF internal API with getNumberOfPages() — available at runtime but
 * missing from the TypeScript declarations.
 */
export interface JsPdfInternal {
  events: import('jspdf').PubSub;
  scaleFactor: number;
  pageSize: {
    width: number;
    getWidth: () => number;
    height: number;
    getHeight: () => number;
  };
  pages: number[];
  getEncryptor(objectId: number): (data: string) => string;
  /** Returns the total number of pages — available at runtime but not in TS declarations */
  getNumberOfPages(): number;
}
