/**
 * Hooks de mutacao para posts de transparencia.
 *
 * Padrao: useMutation do @tanstack/react-query, com invalidacao da query
 * de listagem apos sucesso (consistente com outros hooks do projeto).
 *
 * Documentacao: scripts/PRD_PAGINA_TRANSPARENCIA.md §5.3
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "~/lib/queries";
import type {
  TransparencyListFilters,
  TransparencyPost,
  TransparencyPostType,
} from "~/types/transparency";

interface CreatePostInput {
  startupId: number;
  title: string;
  content: string;
  type?: TransparencyPostType;
  periodMonth?: number;
  periodYear?: number;
  attachmentIds?: number[];
}

async function createTransparencyPost(
  input: CreatePostInput,
): Promise<TransparencyPost> {
  const res = await fetch(
    `/api/transparency/startups/${input.startupId}/posts`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Falha ao criar post (${res.status})`);
  }
  return data?.data ?? data;
}

export function useCreateTransparencyPost(
  startupId: number,
  filters: TransparencyListFilters = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CreatePostInput, "startupId">) =>
      createTransparencyPost({ ...input, startupId }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.transparency.posts(startupId, filters),
      });
    },
  });
}

interface UpdatePostInput {
  postId: number;
  startupId: number;
  title?: string;
  content?: string;
  type?: TransparencyPostType;
  periodMonth?: number;
  periodYear?: number;
  attachmentIds?: number[];
}

async function updateTransparencyPost(
  input: UpdatePostInput,
): Promise<TransparencyPost> {
  const { postId, startupId: _startupId, ...body } = input;
  const res = await fetch(`/api/transparency/posts/${postId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Falha ao atualizar post (${res.status})`);
  }
  return data?.data ?? data;
}

export function useUpdateTransparencyPost(
  startupId: number,
  filters: TransparencyListFilters = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePostInput) => updateTransparencyPost(input),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.transparency.posts(startupId, filters),
      });
    },
  });
}

async function deleteTransparencyPost(postId: number): Promise<void> {
  const res = await fetch(`/api/transparency/posts/${postId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || `Falha ao deletar post (${res.status})`);
  }
}

export function useDeleteTransparencyPost(
  startupId: number,
  filters: TransparencyListFilters = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: number) => deleteTransparencyPost(postId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.transparency.posts(startupId, filters),
      });
    },
  });
}
