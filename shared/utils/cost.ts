import { PROVIDERS } from "../culling/providers";

export const estimateCostForImages = (
  providerId: string,
  imageCount: number,
): number => {
  const p = PROVIDERS.find((x) => x.id === providerId);
  if (!p) return 0;
  const per1k = p.estimatedCostPer1kImages;
  return (per1k / 1000) * imageCount;
};

// alias to preserve older import names in server code
export const estimateCreditsForImages = estimateCostForImages;

export const sortProvidersByCost = () =>
  [...PROVIDERS].sort(
    (a, b) => a.estimatedCostPer1kImages - b.estimatedCostPer1kImages,
  );
