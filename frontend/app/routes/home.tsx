import { redirect } from "react-router";
import type { Route } from "./+types/home";

// The "/" route has no public landing page — send visitors to the login page.
export function loader(_args: Route.LoaderArgs): Response {
  return redirect("/login");
}

export default function Home() {
  return null;
}
