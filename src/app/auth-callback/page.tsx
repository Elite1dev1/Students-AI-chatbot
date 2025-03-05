
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/app/_trpc/client";
import { Loader2 } from "lucide-react";

const Page = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const origin = searchParams.get("origin");

  // Use enabled option to control when the query runs
  const { isLoading, isError } = trpc.authCallback.useQuery(undefined, {
    enabled: true,
    retry: true,
    retryDelay: 500,
    staleTime: 0,
    onSuccess: (data) => {
      if (data?.success) {
        router.push(origin ? `/${origin}` : "/dashboard");
      }
    },
    onError: () => {
      router.push("/error");
    },
  });

  if (isError) {
    return null;
  }

  return (
    <div className="w-full mt-24 flex justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-800" />
        <h3 className="font-semibold text-xl">Setting up your account...</h3>
        

        
        <p>You will be redirected automatically.</p>
      </div>
    </div>
  );
};

export default Page;
