import { redirect } from "react-router";

export const redirectIfAuthenticated = async (
  request: Request,
  redirectTo: string = "/home",
): Promise<void> => {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return;

  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...rest] = c.trim().split("=");
      return [key, rest.join("=")];
    }),
  );

  if (cookies["session_id"]) {
    throw redirect(redirectTo);
  }
};
