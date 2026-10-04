import { PortalShell } from "@/components/portal-shell";
import {
  Access,
  Modules,
  Overview,
  SettingsPreview,
  SetupGuide,
} from "@/components/preview-content";

const views = {
  overview: Overview,
  modules: Modules,
  access: Access,
  settings: SettingsPreview,
  setup: SetupGuide,
};
export default async function Preview({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view =
    params.view && Object.hasOwn(views, params.view)
      ? (params.view as keyof typeof views)
      : "overview";
  const Content = views[view];
  return (
    <PortalShell view={view}>
      <Content />
    </PortalShell>
  );
}
