import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

export namespace Route {
  export type MetaArgs = { params: Record<string, string> };
  export type LoaderArgs = LoaderFunctionArgs;
  export type ActionArgs = ActionFunctionArgs;
  export type ComponentProps = {
    loaderData: { search: string };
    actionData?: { ok?: boolean; success?: boolean; message?: string };
    params: Record<string, string>;
  };
}
