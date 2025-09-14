import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(method: string, url: string, data?: any) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response;
}

export const getPricingForVin = async (vin: string, year: number): Promise<number | null> => {
  console.log(`🔍 Requesting pricing for VIN: ${vin}, Year: ${year}`);

  const response = await apiRequest("POST", "/api/pricing/lookup", { vin, year });

  if (!response.ok) {
    if (response.status === 404) {
      console.log(`❌ No pricing data found for VIN: ${vin}`);
      return null; // No pricing data found
    }
    console.error(`❌ Failed to get pricing data: ${response.status} ${response.statusText}`);
    throw new Error("Failed to get pricing data");
  }

  const data = await response.json();
  console.log(`💰 Pricing result: $${data.price} for VIN: ${vin}`);
  return data.price;
};

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});