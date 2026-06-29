/**
 * Document CRUD hooks
 * Routes: GET/POST /api/documents, GET/PUT/DELETE /api/documents/[id]
 */

'use client';

import { createCrudHooks } from './create-crud-hooks';

export interface Document {
  id: string;
  filename: string;
  originalName?: string;
  filePath?: string;
  fileType?: string;
  mimeType?: string;
  fileSize?: number;
  category?: string;
  projectId?: string;
  projectName?: string;
  description?: string;
  tags?: string[];
  uploadedBy?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
}

const documentCrud = createCrudHooks<Document>({
  basePath: '/api/documents',
  queryKey: 'documents',
});

export const useDocuments = documentCrud.useAll;
export const useDocument = documentCrud.useOne;
export const useCreateDocument = documentCrud.useCreate;
export const useUpdateDocument = documentCrud.useUpdate;
export const useDeleteDocument = documentCrud.useDelete;
