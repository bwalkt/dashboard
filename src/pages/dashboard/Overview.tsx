import Overview from "@/features/overview/components/overview";
import { UserDebugInfo } from "@/components/UserDebugInfo";

export default function OverviewPage() {
  return (
    <div>
      <UserDebugInfo />
      <Overview />
    </div>
  );
}
