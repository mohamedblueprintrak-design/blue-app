/**
 * Proposals API hooks
 */

'use client';

import { createCrudHooks } from './create-crud-hooks';

export interface Proposal {
  id: string;
  proposalNumber?: string;
  projectId?: string;
  projectName?: string;
  clientId?: string;
  clientName?: string;
  title?: string;
  value?: number;
  status?: string;
  validUntil?: Date | string;
  description?: string;
  createdAt?: Date | string;
}

const proposalHooks = createCrudHooks<Proposal>({
  basePath: '/api/proposals',
  queryKey: 'proposals',
  invalidateKeys: [['dashboard'], ['projects'], ['clients']],
});

export const useProposals = proposalHooks.useAll;
export const useProposal = proposalHooks.useOne;
export const useCreateProposal = proposalHooks.useCreate;
export const useUpdateProposal = proposalHooks.useUpdate;
export const useDeleteProposal = proposalHooks.useDelete;
