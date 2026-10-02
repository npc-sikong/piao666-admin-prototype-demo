import { RobotExecutionsPage } from "@/features/robots/robot-executions-page";

export default async function AdminMasterExecutionsRoute({
  params,
}: Readonly<{ params: Promise<{ robotId: string }> }>) {
  const { robotId } = await params;
  return <RobotExecutionsPage robotId={robotId} />;
}
