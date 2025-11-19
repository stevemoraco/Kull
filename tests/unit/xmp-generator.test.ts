/**
 * Unit Tests for XMP Generator
 *
 * Tests XMP sidecar file generation, XML escaping, and Lightroom compatibility
 */

import { describe, it, expect } from 'vitest';
import {
  generateXmpSidecar,
  getXmpFilename,
  generateXmpBatch,
  validateRatingForXmp,
} from '../../shared/utils/xmp-generator';
import type { PhotoRating } from '../../server/ai/BaseProviderAdapter';

describe('XMP Generator', () => {
  const mockRating: PhotoRating = {
    imageId: 'test-123',
    filename: 'IMG_1234.CR3',
    starRating: 5,
    colorLabel: 'green',
    keepReject: 'keep',
    description: 'Bride laughing during vows as groom wipes tears',
    tags: ['wedding', 'ceremony', 'emotional', 'hero'],
    technicalQuality: {
      focusAccuracy: 950,
      exposureQuality: 875,
      compositionScore: 920,
      lightingQuality: 900,
      colorHarmony: 850,
      noiseLevel: 800,
      sharpnessDetail: 940,
      dynamicRange: 880,
      overallTechnical: 915,
    },
    subjectAnalysis: {
      primarySubject: 'Bride',
      emotionIntensity: 980,
      eyesOpen: true,
      eyeContact: false,
      genuineExpression: 975,
      facialSharpness: 960,
      bodyLanguage: 940,
      momentTiming: 990,
      storyTelling: 950,
      uniqueness: 920,
    },
  };

  describe('generateXmpSidecar', () => {
    it('should generate valid XMP XML structure', () => {
      const xmp = generateXmpSidecar(mockRating, mockRating.filename);

      expect(xmp).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xmp).toContain('<x:xmpmeta xmlns:x="adobe:ns:meta/"');
      expect(xmp).toContain('<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">');
      expect(xmp).toContain('</rdf:RDF>');
      expect(xmp).toContain('</x:xmpmeta>');
    });

    it('should include Lightroom-compatible fields', () => {
      const xmp = generateXmpSidecar(mockRating, mockRating.filename);

      // Star rating
      expect(xmp).toContain('<xmp:Rating>5</xmp:Rating>');

      // Color label
      expect(xmp).toContain('<xmp:Label>green</xmp:Label>');

      // Description
      expect(xmp).toContain('<dc:description>');
      expect(xmp).toContain('Bride laughing during vows');

      // Tags
      expect(xmp).toContain('<dc:subject>');
      expect(xmp).toContain('<rdf:li>wedding</rdf:li>');
      expect(xmp).toContain('<rdf:li>ceremony</rdf:li>');
      expect(xmp).toContain('<rdf:li>emotional</rdf:li>');
      expect(xmp).toContain('<rdf:li>hero</rdf:li>');

      // Keep/Reject
      expect(xmp).toContain('<photoshop:Category>keep</photoshop:Category>');
    });

    it('should include Kull-specific metadata fields', () => {
      const xmp = generateXmpSidecar(mockRating, mockRating.filename);

      // Technical quality scores
      expect(xmp).toContain('<kull:TechnicalQualityOverall>915</kull:TechnicalQualityOverall>');
      expect(xmp).toContain('<kull:Sharpness>950</kull:Sharpness>');
      expect(xmp).toContain('<kull:Exposure>875</kull:Exposure>');
      expect(xmp).toContain('<kull:Composition>920</kull:Composition>');

      // Subject analysis scores
      expect(xmp).toContain('<kull:EmotionIntensity>980</kull:EmotionIntensity>');
      expect(xmp).toContain('<kull:FacialSharpness>960</kull:FacialSharpness>');
      expect(xmp).toContain('<kull:MomentTiming>990</kull:MomentTiming>');

      // Subject metadata
      expect(xmp).toContain('<kull:Subject>Bride</kull:Subject>');
      expect(xmp).toContain('<kull:EyesOpen>true</kull:EyesOpen>');
      expect(xmp).toContain('<kull:EyeContact>false</kull:EyeContact>');
    });

    it('should properly escape XML special characters', () => {
      const ratingWithSpecialChars: PhotoRating = {
        ...mockRating,
        description: 'Bride & Groom\'s "First Kiss" <amazing>',
        subjectAnalysis: {
          ...mockRating.subjectAnalysis,
          primarySubject: 'Bride & Groom',
        },
      };

      const xmp = generateXmpSidecar(ratingWithSpecialChars, ratingWithSpecialChars.filename);

      expect(xmp).toContain('Bride &amp; Groom&apos;s &quot;First Kiss&quot; &lt;amazing&gt;');
      expect(xmp).toContain('<kull:Subject>Bride &amp; Groom</kull:Subject>');
    });

    it('should handle all star ratings (1-5)', () => {
      for (let stars = 1; stars <= 5; stars++) {
        const rating = { ...mockRating, starRating: stars as 1 | 2 | 3 | 4 | 5 };
        const xmp = generateXmpSidecar(rating, rating.filename);
        expect(xmp).toContain(`<xmp:Rating>${stars}</xmp:Rating>`);
      }
    });

    it('should handle all color labels', () => {
      const colorLabels: Array<'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'none'> = [
        'red',
        'yellow',
        'green',
        'blue',
        'purple',
        'none',
      ];

      for (const label of colorLabels) {
        const rating = { ...mockRating, colorLabel: label };
        const xmp = generateXmpSidecar(rating, rating.filename);
        expect(xmp).toContain(`<xmp:Label>${label}</xmp:Label>`);
      }
    });

    it('should handle all keep/reject values', () => {
      const keepRejectValues: Array<'keep' | 'reject' | 'maybe'> = ['keep', 'reject', 'maybe'];

      for (const value of keepRejectValues) {
        const rating = { ...mockRating, keepReject: value };
        const xmp = generateXmpSidecar(rating, rating.filename);
        expect(xmp).toContain(`<photoshop:Category>${value}</photoshop:Category>`);
      }
    });

    it('should handle empty tags array', () => {
      const ratingNoTags = { ...mockRating, tags: [] };
      const xmp = generateXmpSidecar(ratingNoTags, ratingNoTags.filename);

      expect(xmp).toContain('<dc:subject>');
      expect(xmp).toContain('</dc:subject>');
    });

    it('should use default values for missing technical scores', () => {
      const ratingMinimal: PhotoRating = {
        imageId: 'test-456',
        filename: 'IMG_5678.CR3',
        starRating: 3,
        colorLabel: 'yellow',
        keepReject: 'maybe',
        description: 'Test image',
        tags: ['test'],
        technicalQuality: {
          focusAccuracy: 0,
          exposureQuality: 0,
          compositionScore: 0,
          lightingQuality: 0,
          colorHarmony: 0,
          noiseLevel: 0,
          sharpnessDetail: 0,
          dynamicRange: 0,
          overallTechnical: 0,
        },
        subjectAnalysis: {
          primarySubject: 'Unknown',
          emotionIntensity: 0,
          eyesOpen: false,
          eyeContact: false,
          genuineExpression: 0,
          facialSharpness: 0,
          bodyLanguage: 0,
          momentTiming: 0,
          storyTelling: 0,
          uniqueness: 0,
        },
      };

      const xmp = generateXmpSidecar(ratingMinimal, ratingMinimal.filename);

      // Should use 500 as default for missing scores
      expect(xmp).toContain('<kull:Sharpness>500</kull:Sharpness>');
      expect(xmp).toContain('<kull:Exposure>500</kull:Exposure>');
    });
  });

  describe('getXmpFilename', () => {
    it('should replace image extension with .xmp', () => {
      expect(getXmpFilename('IMG_1234.CR3')).toBe('IMG_1234.xmp');
      expect(getXmpFilename('IMG_5678.NEF')).toBe('IMG_5678.xmp');
      expect(getXmpFilename('DSC_9999.ARW')).toBe('DSC_9999.xmp');
      expect(getXmpFilename('photo.jpg')).toBe('photo.xmp');
    });

    it('should handle files without extension', () => {
      expect(getXmpFilename('IMG_1234')).toBe('IMG_1234.xmp');
    });

    it('should handle files with multiple dots', () => {
      expect(getXmpFilename('my.photo.final.CR3')).toBe('my.photo.final.xmp');
    });
  });

  describe('generateXmpBatch', () => {
    it('should generate XMP files for multiple ratings', () => {
      const ratings: PhotoRating[] = [
        { ...mockRating, filename: 'IMG_0001.CR3', imageId: '1' },
        { ...mockRating, filename: 'IMG_0002.CR3', imageId: '2' },
        { ...mockRating, filename: 'IMG_0003.CR3', imageId: '3' },
      ];

      const xmpFiles = generateXmpBatch(ratings);

      expect(xmpFiles.size).toBe(3);
      expect(xmpFiles.has('IMG_0001.xmp')).toBe(true);
      expect(xmpFiles.has('IMG_0002.xmp')).toBe(true);
      expect(xmpFiles.has('IMG_0003.xmp')).toBe(true);

      // Verify each XMP contains correct content
      const xmp1 = xmpFiles.get('IMG_0001.xmp');
      expect(xmp1).toBeDefined();
      expect(xmp1).toContain('<xmp:Rating>5</xmp:Rating>');
    });

    it('should handle large batches (1000+ files)', () => {
      const ratings: PhotoRating[] = Array.from({ length: 1000 }, (_, i) => ({
        ...mockRating,
        filename: `IMG_${String(i).padStart(4, '0')}.CR3`,
        imageId: `${i}`,
      }));

      const xmpFiles = generateXmpBatch(ratings);

      expect(xmpFiles.size).toBe(1000);
      expect(xmpFiles.has('IMG_0000.xmp')).toBe(true);
      expect(xmpFiles.has('IMG_0999.xmp')).toBe(true);
    });
  });

  describe('validateRatingForXmp', () => {
    it('should validate complete rating', () => {
      expect(validateRatingForXmp(mockRating)).toBe(true);
    });

    it('should reject rating without filename', () => {
      const invalid = { ...mockRating, filename: '' };
      expect(validateRatingForXmp(invalid)).toBe(false);
    });

    it('should reject invalid star rating', () => {
      const invalid1 = { ...mockRating, starRating: 0 as any };
      const invalid2 = { ...mockRating, starRating: 6 as any };
      expect(validateRatingForXmp(invalid1)).toBe(false);
      expect(validateRatingForXmp(invalid2)).toBe(false);
    });

    it('should reject invalid color label', () => {
      const invalid = { ...mockRating, colorLabel: 'pink' as any };
      expect(validateRatingForXmp(invalid)).toBe(false);
    });

    it('should reject invalid keepReject value', () => {
      const invalid = { ...mockRating, keepReject: 'archive' as any };
      expect(validateRatingForXmp(invalid)).toBe(false);
    });

    it('should reject rating without description', () => {
      const invalid = { ...mockRating, description: '' };
      expect(validateRatingForXmp(invalid)).toBe(false);
    });

    it('should reject rating without tags array', () => {
      const invalid = { ...mockRating, tags: null as any };
      expect(validateRatingForXmp(invalid)).toBe(false);
    });

    it('should reject rating without technical quality', () => {
      const invalid = { ...mockRating, technicalQuality: null as any };
      expect(validateRatingForXmp(invalid)).toBe(false);
    });

    it('should reject rating without subject analysis', () => {
      const invalid = { ...mockRating, subjectAnalysis: null as any };
      expect(validateRatingForXmp(invalid)).toBe(false);
    });
  });

  describe('XML Validation', () => {
    it('should generate parseable XML', () => {
      const xmp = generateXmpSidecar(mockRating, mockRating.filename);

      // Basic XML validation - should not throw
      expect(() => {
        if (typeof DOMParser !== 'undefined') {
          const parser = new DOMParser();
          const doc = parser.parseFromString(xmp, 'text/xml');
          const parseError = doc.querySelector('parsererror');
          if (parseError) {
            throw new Error('XML parsing failed');
          }
        }
      }).not.toThrow();
    });

    it('should include all required XML namespaces', () => {
      const xmp = generateXmpSidecar(mockRating, mockRating.filename);

      expect(xmp).toContain('xmlns:xmp="http://ns.adobe.com/xap/1.0/"');
      expect(xmp).toContain('xmlns:dc="http://purl.org/dc/elements/1.1/"');
      expect(xmp).toContain('xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"');
      expect(xmp).toContain('xmlns:kull="http://kull.ai/ns/1.0/"');
    });
  });
});
