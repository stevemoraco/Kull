/**
 * XMP Sidecar File Generator
 *
 * Generates Adobe Lightroom-compatible XMP sidecar files from Kull AI photo ratings.
 * Based on XMP_FORMAT_SPECIFICATION.md created by Agent 9.
 *
 * @see /apps/Kull Universal App/kull/XMP_FORMAT_SPECIFICATION.md
 */

import type { PhotoRating } from '../../server/ai/BaseProviderAdapter';

/**
 * Escapes special XML characters to prevent parsing errors
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates a complete XMP sidecar file for a single photo rating
 *
 * @param rating - PhotoRating object from AI analysis
 * @param filename - Original image filename (e.g., "IMG_1234.CR3")
 * @returns Complete XMP file content as string
 */
export function generateXmpSidecar(rating: PhotoRating, filename: string): string {
  const {
    starRating,
    colorLabel,
    keepReject,
    description,
    tags,
    technicalQuality,
    subjectAnalysis,
  } = rating;

  // Build tags array
  const tagElements = tags.map((tag) => `          <rdf:li>${escapeXml(tag)}</rdf:li>`).join('\n');

  // Extract detailed technical scores (1-1000 scale)
  const sharpness = technicalQuality.focusAccuracy || technicalQuality.sharpnessDetail || 500;
  const exposure = technicalQuality.exposureQuality || 500;
  const composition = technicalQuality.compositionScore || 500;
  const overallTechnical = technicalQuality.overallTechnical || 500;
  const lighting = technicalQuality.lightingQuality || 500;
  const colorHarmony = technicalQuality.colorHarmony || 500;
  const dynamicRange = technicalQuality.dynamicRange || 500;
  const noiseLevel = technicalQuality.noiseLevel || 500;

  // Extract subject analysis scores
  const emotionIntensity = subjectAnalysis.emotionIntensity || 500;
  const genuineExpression = subjectAnalysis.genuineExpression || 500;
  const facialSharpness = subjectAnalysis.facialSharpness || 500;
  const momentTiming = subjectAnalysis.momentTiming || 500;
  const storyTelling = subjectAnalysis.storyTelling || 500;
  const uniqueness = subjectAnalysis.uniqueness || 500;
  const bodyLanguage = subjectAnalysis.bodyLanguage || 500;

  const primarySubject = escapeXml(subjectAnalysis.primarySubject || 'Unknown');
  const eyesOpen = subjectAnalysis.eyesOpen ? 'true' : 'false';
  const eyeContact = subjectAnalysis.eyeContact ? 'true' : 'false';

  // Escape description
  const escapedDescription = escapeXml(description);

  // Generate XMP content
  return `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Kull AI 1.0">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:xmp="http://ns.adobe.com/xap/1.0/"
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
        xmlns:kull="http://kull.ai/ns/1.0/">

      <!-- Lightroom-compatible fields -->
      <xmp:Rating>${starRating}</xmp:Rating>
      <xmp:Label>${colorLabel}</xmp:Label>

      <dc:description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${escapedDescription}</rdf:li>
        </rdf:Alt>
      </dc:description>

      <dc:subject>
        <rdf:Bag>
${tagElements}
        </rdf:Bag>
      </dc:subject>

      <photoshop:Category>${keepReject}</photoshop:Category>

      <!-- Kull-specific metadata (preserved for future re-ranking) -->
      <kull:TechnicalQualityOverall>${overallTechnical}</kull:TechnicalQualityOverall>
      <kull:Sharpness>${sharpness}</kull:Sharpness>
      <kull:Exposure>${exposure}</kull:Exposure>
      <kull:Composition>${composition}</kull:Composition>
      <kull:Lighting>${lighting}</kull:Lighting>
      <kull:ColorHarmony>${colorHarmony}</kull:ColorHarmony>
      <kull:DynamicRange>${dynamicRange}</kull:DynamicRange>
      <kull:NoiseLevel>${noiseLevel}</kull:NoiseLevel>

      <kull:EmotionIntensity>${emotionIntensity}</kull:EmotionIntensity>
      <kull:GenuineExpression>${genuineExpression}</kull:GenuineExpression>
      <kull:FacialSharpness>${facialSharpness}</kull:FacialSharpness>
      <kull:MomentTiming>${momentTiming}</kull:MomentTiming>
      <kull:StoryTelling>${storyTelling}</kull:StoryTelling>
      <kull:Uniqueness>${uniqueness}</kull:Uniqueness>
      <kull:BodyLanguage>${bodyLanguage}</kull:BodyLanguage>

      <kull:Subject>${primarySubject}</kull:Subject>
      <kull:EyesOpen>${eyesOpen}</kull:EyesOpen>
      <kull:EyeContact>${eyeContact}</kull:EyeContact>
      <kull:ProcessedBy>Kull AI</kull:ProcessedBy>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;
}

/**
 * Generates XMP filename from image filename
 *
 * @param imageFilename - Original image filename (e.g., "IMG_1234.CR3")
 * @returns XMP sidecar filename (e.g., "IMG_1234.xmp")
 */
export function getXmpFilename(imageFilename: string): string {
  const lastDotIndex = imageFilename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    // No extension found, just append .xmp
    return `${imageFilename}.xmp`;
  }

  // Replace extension with .xmp
  const baseName = imageFilename.substring(0, lastDotIndex);
  return `${baseName}.xmp`;
}

/**
 * Batch generates multiple XMP sidecars from array of ratings
 *
 * @param ratings - Array of PhotoRating objects
 * @returns Map of filename -> XMP content
 */
export function generateXmpBatch(ratings: PhotoRating[]): Map<string, string> {
  const xmpFiles = new Map<string, string>();

  for (const rating of ratings) {
    const xmpFilename = getXmpFilename(rating.filename);
    const xmpContent = generateXmpSidecar(rating, rating.filename);
    xmpFiles.set(xmpFilename, xmpContent);
  }

  return xmpFiles;
}

/**
 * Validates that rating contains required fields for XMP generation
 *
 * @param rating - PhotoRating object to validate
 * @returns true if valid, false otherwise
 */
export function validateRatingForXmp(rating: PhotoRating): boolean {
  if (!rating.filename) return false;
  if (!rating.starRating || rating.starRating < 1 || rating.starRating > 5) return false;
  if (!['red', 'yellow', 'green', 'blue', 'purple', 'none'].includes(rating.colorLabel)) return false;
  if (!['keep', 'reject', 'maybe'].includes(rating.keepReject)) return false;
  if (!rating.description) return false;
  if (!Array.isArray(rating.tags)) return false;
  if (!rating.technicalQuality) return false;
  if (!rating.subjectAnalysis) return false;

  return true;
}
