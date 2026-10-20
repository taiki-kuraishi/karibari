import { Alert, AlertDescription, AlertTitle } from "@karibari/shadcn/components/alert";
import { TriangleAlert } from "lucide-react";

export function ConsentError({ isTransportError }: { isTransportError: boolean }) {
  if (isTransportError) {
    return (
      <Alert variant="destructive">
        <TriangleAlert />
        <AlertTitle>リクエストを処理できませんでした</AlertTitle>
        <AlertDescription>
          時間をおいて再度お試しください。アプリケーションからやり直すこともできます。
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <TriangleAlert />
      <AlertTitle>リクエストを処理できません</AlertTitle>
      <AlertDescription>
        このログイン要求の有効期限が切れました。お手数ですが、アプリケーションからもう一度ログインしてください。
      </AlertDescription>
    </Alert>
  );
}
