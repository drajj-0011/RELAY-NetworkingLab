import { listExperiments } from "@/db/experimentStore";
import { mongoStatus } from "@/db/mongo";
import NetworkLab from "@/components/network-lab";
import { Footer, Hero, LearningSections, ProtocolStackScene, ScenarioLibrary, SiteHeader } from "@/components/story-sections";

export const dynamic = "force-dynamic";

async function loadExperiments() {
  try {
    return { experiments: await listExperiments(), databaseError: null };
  } catch (error) {
    return { experiments: [], databaseError: error?.message ?? "MongoDB is unavailable." };
  }
}

export default async function HomePage() {
  const { experiments, databaseError } = await loadExperiments();
  const database = mongoStatus();

  return (
    <main>
      <SiteHeader />
      <Hero />
      <NetworkLab
        initialExperiments={experiments}
        databaseError={databaseError}
        databaseUri={database.uri}
        backend="next"
      />
      <ProtocolStackScene />
      <ScenarioLibrary />
      <LearningSections />
      <Footer />
    </main>
  );
}
