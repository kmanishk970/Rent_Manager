import { redirect } from "next/navigation";

/**
 * There is no marketing page — the root just enters the app. The dashboard
 * layout's guard bounces unauthenticated visitors to /login from there.
 */
export default function RootPage() {
  redirect("/dashboard");
}
