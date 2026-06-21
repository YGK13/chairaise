// /landing is now the homepage at / — redirect to keep old links working.
import { redirect } from "next/navigation";

export default function LandingRedirect() {
  redirect("/");
}
