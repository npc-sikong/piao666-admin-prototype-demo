import { RobotDetailPage } from "@/features/robots/robot-detail-page";

export default async function AdminMasterDetailRoute({
  params,
}: Readonly<{ params: Promise<{ robotId: string }> }>) {
  const { robotId } = await params;
  return <RobotDetailPage robotId={robotId} />;
}
