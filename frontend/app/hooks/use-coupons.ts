/** Query compartilhada para listar cupons administrativos. */

import { useQuery } from "@tanstack/react-query";
import type { CouponFilters } from "~/lib/api/coupons";
import { couponsQueryOptions } from "~/lib/queries";

export { couponsQueryOptions } from "~/lib/queries";

export function useCoupons(filters: CouponFilters = {}) {
  return useQuery(couponsQueryOptions(filters));
}
