import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { authClient } from "../../../lib/auth-client";
import { REQUEST_FAILED } from "../constant";

// 同意・拒否・アカウント切替の操作とその失敗表示だけを持つ hook。
// 表示 component（Card）が直接読む。自動実行の effect は持たない。
export function useConsentActions() {
  const [requestError, setRequestError] = useState<string | undefined>(undefined);
  const consentMutation = useMutation({
    mutationFn: async (accept: boolean) => {
      const { data, error: consentError } = await authClient.oauth2.consent({ accept });
      if (consentError) {
        throw new Error("consent failed");
      }

      return data;
    },
    onError: () => {
      setRequestError(REQUEST_FAILED);
    },
    onSuccess: (data) => {
      if (data?.url) {
        globalThis.location.href = data.url;
      }
    },
  });
  const switchAccountMutation = useMutation({
    mutationFn: async () => {
      const { error: signOutError } = await authClient.signOut();
      if (signOutError) {
        throw new Error("sign-out failed");
      }
    },
    onError: () => {
      setRequestError(REQUEST_FAILED);
    },
    onSuccess: () => {
      // 署名付きクエリを付けたまま移り、sign-in が同じ認可要求を再開できるようにする。
      globalThis.location.href = `/sign-in${globalThis.location.search}`;
    },
  });

  return {
    consent: (accept: boolean) => consentMutation.mutate(accept),
    consentPending: consentMutation.isPending,
    isPending: consentMutation.isPending || switchAccountMutation.isPending,
    requestError,
    switchAccount: () => switchAccountMutation.mutate(),
  };
}
