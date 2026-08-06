import { RepositoryWorkspace } from "@/components/workspace/RepositoryWorkspace";

type ProjectWorkspacePageProps = { params: { id: string } };

export default function ProjectWorkspacePage({ params }: ProjectWorkspacePageProps) {
  const projectId = Number(params.id);
  return <div className="-m-5 sm:-m-8">{Number.isInteger(projectId) && projectId > 0 ? <RepositoryWorkspace projectId={projectId} /> : <p className="p-8 text-sm text-rose-300">Invalid project ID.</p>}</div>;
}
