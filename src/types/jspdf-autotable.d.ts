/**
 * Type augmentation for jsPDF autoTable plugin.
 *
 * The autoTable plugin adds a `lastAutoTable` property to the jsPDF instance
 * after each table is drawn, containing layout information like `finalY`.
 * The plugin's TypeScript declarations don't expose this on the main type,
 * so we augment it here to avoid `as unknown as` casts throughout the codebase.
 */

import 'jspdf';

declare module 'jspdf' {
  interface jsPDF {
    /** Set by autoTable after drawing a table; contains layout info */
    lastAutoTable?: {
      /** The Y position after the last row of the table */
      finalY: number;
    };
  }
}
