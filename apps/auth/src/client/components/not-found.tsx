import { CircleQuestionMark } from "lucide-react";

import { StatusCard } from "./status-card";

// The wording is deliberately vague about why, matching the viewer's 404.
export function NotFoundPage() {
  return (
    <StatusCard
      code="404"
      description="お探しのページは存在しないか、表示する権限がありません。"
      icon={<CircleQuestionMark />}
      title="ページが見つかりません"
    />
  );
}
