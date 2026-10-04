/**
 * Hooks de mutacao para Discussions (TRANSP-04):
 *   useCreateDiscussion / useUpdateDiscussion / useDeleteDiscussion
 *   useCreateReply / useDeleteReply
 *
 * Padrao: useMutation do @tanstack/react-query com invalidacao por queryKey.
 * NUNCA expostos campos PII (cpf/email/phone); apenas authorPublicId retornado pelo backend.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";
import type {
  DiscussionCategory,
  DiscussionDetailResponse,
  DiscussionListFilters,
  TransparencyDiscussion,
  TransparencyReply,
} from "~/types/transparency";

/* --------------------------------- Create --------------------------------- */

export interface CreateDiscussionInput {
  startupId: number;
  title: string;
  content: string;
  category: DiscussionCategory;
  isAnonymous: boolean;
}

async function createDiscussion(
  input: CreateDiscussionInput,
): Promise<TransparencyDiscussion> {
  const { startupId, ...body } = input;
  const res = await fetch(
    `/api/transparency/discussions/${startupId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Falha ao criar thread (${res.status})`);
  }
  return data?.data ?? data;
}

export function useCreateDiscussion(
  startupId: number,
  filters: DiscussionListFilters = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CreateDiscussionInput, "startupId">) =>
      createDiscussion({ ...input, startupId }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.transparency.discussions(startupId),
      });
    },
  });
}

/* --------------------------------- Update --------------------------------- */

export interface UpdateDiscussionInput {
  id: string;
  title?: string;
  content?: string;
  category?: DiscussionCategory;
  isAnonymous?: boolean;
}

async function updateDiscussion(
  input: UpdateDiscussionInput,
): Promise<TransparencyDiscussion> {
  const { id, ...body } = input;
  const res = await fetch(`/api/transparency/discussions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Falha ao atualizar thread (${res.status})`);
  }
  return data?.data ?? data;
}

export function useUpdateDiscussion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDiscussionInput) => updateDiscussion(input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.transparency.discussion(vars.id),
      });
      qc.invalidateQueries({ queryKey: queryKeys.transparency.allDiscussions });
    },
  });
}

/* --------------------------------- Delete --------------------------------- */

export interface DeleteDiscussionInput {
  id: string;
  /** true se houver replies (backend exige force=true nesse caso). */
  force?: boolean;
}

async function deleteDiscussion(input: DeleteDiscussionInput): Promise<void> {
  const { id, force } = input;
  const res = await fetch(`/api/transparency/discussions/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ force: !!force }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || `Falha ao deletar thread (${res.status})`);
  }
}

export function useDeleteDiscussion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DeleteDiscussionInput) => deleteDiscussion(input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.transparency.allDiscussions });
      qc.removeQueries({ queryKey: queryKeys.transparency.discussion(vars.id) });
    },
  });
}

/* ---------------------------------- Reply --------------------------------- */

export interface CreateReplyInput {
  discussionId: string;
  content: string;
}

async function createReply(input: CreateReplyInput): Promise<TransparencyReply> {
  const { discussionId, content } = input;
  const res = await fetch(
    `/api/transparency/discussions/${discussionId}/replies`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Falha ao criar reply (${res.status})`);
  }
  return data?.data ?? data;
}

export function useCreateReply(discussionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CreateReplyInput, "discussionId">) =>
      createReply({ ...input, discussionId }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.transparency.discussion(discussionId),
      });
    },
  });
}

export function useDeleteReply(discussionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (replyId: string) => {
      const res = await fetch(
        `/api/transparency/replies/${replyId}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `Falha ao deletar reply (${res.status})`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.transparency.discussion(discussionId),
      });
    },
  });
}