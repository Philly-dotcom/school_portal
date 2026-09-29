import { redirect } from "next/navigation";
import { isPortalConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";
export default function Home() { redirect(isPortalConfigured() ? "/dashboard" : "/preview"); }
