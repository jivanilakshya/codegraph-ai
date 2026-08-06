import { Activity, FolderGit2, GitBranch, Network } from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="A unified view of your codebase knowledge graph and developer workflow." />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Projects" value="Coming Soon" icon={FolderGit2} />
        <StatCard label="Repositories" value="Coming Soon" icon={GitBranch} />
        <StatCard label="Graph nodes" value="Coming Soon" icon={Network} />
        <StatCard label="Activity" value="Coming Soon" icon={Activity} />
      </section>
    </div>
  );
}
