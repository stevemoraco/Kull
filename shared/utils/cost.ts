import { PROVIDERS, getProviderConfig } from "../culling/providers";
import { ProviderId } from "../culling/schemas";

const PROFIT_MARGIN_MULTIPLIER = 2; // 50% margin baked into credit usage

export const estimateCreditsForImages = (
  providerId: ProviderId,
  imageCount: number,
): number => {
  const provider = getProviderConfig(providerId);
  if (provider.onDevice) {
    return 0;
  }
  const baseCostPerImage = provider.baseCostPerThousandImagesUSD / 1000;
  const rawCost = baseCostPerImage * imageCount;
  const creditedCost = rawCost * PROFIT_MARGIN_MULTIPLIER;
  return Math.max(Math.ceil(creditedCost), 0);
};

export const estimateCostUSD = (
  providerId: ProviderId,
  imageCount: number,
): number => {
  const provider = getProviderConfig(providerId);
  if (provider.onDevice) {
    return 0;
  }
  const baseCostPerImage = provider.baseCostPerThousandImagesUSD / 1000;
  return baseCostPerImage * imageCount * PROFIT_MARGIN_MULTIPLIER;
};

export const getProviderBatchSize = (providerId: ProviderId): number =>
  PROVIDERS[providerId]?.maxBatchSize ?? 20;
