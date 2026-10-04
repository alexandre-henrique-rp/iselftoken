import { useQuery } from "@tanstack/react-query";
import {
  fundraisingConfigQueryOptions,
  type FundraisingConfig,
} from "~/lib/queries";

export type { FundraisingConfig };

export function useAdminFundraisingConfigQuery() {
  return useQuery<FundraisingConfig>(fundraisingConfigQueryOptions);
}
