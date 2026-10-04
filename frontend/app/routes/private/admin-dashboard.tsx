import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { AdminDashboardScreen } from "~/components/admin/admin-dashboard-screen";
import { useAdminDashboardSummaryQuery } from "~/hooks/use-admin-dashboard-summary";
import {
  adminDashboardAction,
  adminDashboardLoader,
} from "./admin-dashboard.server";

export const meta = () => [{ title: "Admin Dashboard | iSelfToken" }];
export const loader = adminDashboardLoader;
export const action = adminDashboardAction;

export default function AdminDashboardRoute({
  loaderData,
}: {
  loaderData: { dehydratedState: ReturnType<typeof dehydrate> };
}) {
  return (
    <HydrationBoundary state={loaderData.dehydratedState}>
      <HydratedAdminDashboard />
    </HydrationBoundary>
  );
}

function HydratedAdminDashboard() {
  const { data, isLoading, isError, isFetching, refetch } =
    useAdminDashboardSummaryQuery();

  return (
    <AdminDashboardScreen
      data={data ?? null}
      isLoading={isLoading}
      isError={isError}
      isFetching={isFetching}
      onRetry={refetch}
    />
  );
}
