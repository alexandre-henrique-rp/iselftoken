import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

export namespace Route {
  export type MetaArgs = { params: Record<string, string> };
  export type LoaderArgs = LoaderFunctionArgs;
  export type ActionArgs = ActionFunctionArgs;
  export type ComponentProps = {
    loaderData: {
      plan: import("~/lib/plan-types").PlanItem | null;
      id: string | null;
    };
    actionData?: unknown;
    params: Record<string, string>;
  };
}
