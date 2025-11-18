import { getProvider, listProviders } from "../culling/providers";

export const estimateCostForImages = (
  providerId: string,
  imageCount: number,
): number => {
  const provider = getProvider(providerId);
  if (!provider) return 0;
  const per1k = provider.estimatedCostPer1kImages;
  return (per1k / 1000) * imageCount;
};

// alias to preserve older import names in server code
export const estimateCreditsForImages = estimateCostForImages;

export const sortProvidersByCost = () =>
  listProviders().slice().sort(
    (a, b) => a.estimatedCostPer1kImages - b.estimatedCostPer1kImages,
  );
