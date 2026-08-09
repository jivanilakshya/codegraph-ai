import { RepositoryWorkspace } from "@/components/workspace/RepositoryWorkspace";

type ProjectWorkspacePageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function Page({ params }: ProjectWorkspacePageProps) {
  const { id } = await params

  return <RepositoryWorkspace projectId={Number(id)} />
}

export async function generateMetadata({ params }: ProjectWorkspacePageProps) {
  const { id } = await params

  return {
    title: `Project ${id}`
  }
}