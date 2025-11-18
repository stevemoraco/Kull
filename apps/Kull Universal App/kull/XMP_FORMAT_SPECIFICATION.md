# XMP Sidecar Format Specification

## Overview

Kull generates XMP sidecar files compatible with Adobe Lightroom Classic and Lightroom CC. These files contain photo ratings, color labels, descriptions, tags, and custom Kull-specific metadata.

## Format Details

### File Naming Convention

For an image file named `IMG_1234.CR3`, the XMP sidecar is named `IMG_1234.xmp` (same base name, .xmp extension).

### XMP Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Kull iOS 1.0">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:xmp="http://ns.adobe.com/xap/1.0/"
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
        xmlns:kull="http://kull.ai/ns/1.0/">

      <!-- Lightroom-compatible fields -->
      <xmp:Rating>5</xmp:Rating>
      <xmp:Label>green</xmp:Label>

      <dc:description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">AI-generated description of photo</rdf:li>
        </rdf:Alt>
      </dc:description>

      <dc:subject>
        <rdf:Bag>
          <rdf:li>wedding</rdf:li>
          <rdf:li>ceremony</rdf:li>
          <rdf:li>emotional</rdf:li>
        </rdf:Bag>
      </dc:subject>

      <photoshop:Category>keep</photoshop:Category>

      <!-- Kull-specific metadata (preserved for future adjustment) -->
      <kull:TechnicalQuality>915</kull:TechnicalQuality>
      <kull:Sharpness>950</kull:Sharpness>
      <kull:Exposure>875</kull:Exposure>
      <kull:Composition>920</kull:Composition>
      <kull:Subject>Bride &amp; Groom</kull:Subject>
      <kull:EyesOpen>true</kull:EyesOpen>
      <kull:InFocus>true</kull:InFocus>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
```

## Field Mappings

### Star Rating (1-5)

**XMP Field:** `<xmp:Rating>`
**Lightroom Display:** Star rating in Library Grid and Filmstrip
**Values:** 1, 2, 3, 4, 5
**Kull Logic:**
- 1 star: Reject (technical issues, duplicates)
- 2 stars: Unusable (minor issues, backups)
- 3 stars: Usable (deliverable quality)
- 4 stars: Keeper (above average, worth editing)
- 5 stars: Hero shot (portfolio-worthy, peak moments)

### Color Label

**XMP Field:** `<xmp:Label>`
**Lightroom Display:** Color badge in Library Grid
**Values:** `red`, `yellow`, `green`, `blue`, `purple`, `none`
**Kull Logic:**
- Red: Reject
- Yellow: Review needed
- Green: Approved
- Blue: Client favorite
- Purple: Portfolio pick

### Description

**XMP Field:** `<dc:description><rdf:Alt><rdf:li>`
**Lightroom Display:** Caption field in Metadata panel
**Format:** Plain text with XML escaping
**Content:** AI-generated natural language description

Example: "Bride laughing during vows as groom wipes tears, golden hour light streaming through chapel windows"

### Tags (Keywords)

**XMP Field:** `<dc:subject><rdf:Bag><rdf:li>`
**Lightroom Display:** Keywords panel
**Format:** Array of strings
**Content:** AI-generated contextual tags

Examples:
- Event type: `wedding`, `portrait`, `corporate`
- Phase: `ceremony`, `reception`, `getting-ready`
- Subject: `bride`, `groom`, `family`, `couple`
- Quality: `hero`, `5-star`, `emotional`, `candid`
- Technical: `golden-hour`, `backlit`, `shallow-dof`

### Keep/Reject Category

**XMP Field:** `<photoshop:Category>`
**Lightroom Display:** Custom field (not directly visible, but searchable)
**Values:** `keep`, `reject`, `maybe`

## Custom Kull Namespace

Kull stores detailed technical analysis in a custom XML namespace for future re-ranking:

```xml
xmlns:kull="http://kull.ai/ns/1.0/"
```

### Technical Quality Scores (1-1000 scale)

**Purpose:** Allow users to adjust rating criteria after AI processing

- `<kull:TechnicalQuality>` - Overall composite score (1-1000)
- `<kull:Sharpness>` - Focus accuracy (1-1000)
- `<kull:Exposure>` - Exposure quality, considering RAW fixability (1-1000)
- `<kull:Composition>` - Compositional strength (1-1000)

### Subject Analysis

- `<kull:Subject>` - Primary subject (text)
- `<kull:EyesOpen>` - Boolean (critical for portraits)
- `<kull:InFocus>` - Boolean (subject sharpness)

## XML Escaping

All text content MUST be XML-escaped to prevent parsing errors:

| Character | Escaped Form |
|-----------|--------------|
| `&`       | `&amp;`      |
| `<`       | `&lt;`       |
| `>`       | `&gt;`       |
| `"`       | `&quot;`     |
| `'`       | `&apos;`     |

Example:
```
Raw: Bride & Groom's "First Kiss"
Escaped: Bride &amp; Groom&apos;s &quot;First Kiss&quot;
```

## Lightroom Import Workflow

### macOS (Direct Write)

1. User runs Kull on photo folder
2. Kull writes .xmp files next to RAW files
3. User opens Lightroom
4. Lightroom auto-detects XMP sidecars
5. Ratings, labels, keywords appear immediately

### iOS (Share Sheet)

1. User selects folder via UIDocumentPicker
2. Kull processes in sandbox
3. Kull generates .xmp files in sandbox
4. User taps "Share" button
5. iOS share sheet opens with XMP files
6. User selects "Save to Files" or "Photos"
7. User manually places XMP files next to RAW files
8. User opens Lightroom, imports folder
9. Lightroom reads XMP sidecars

## Re-Ranking Without Re-Processing

Users can adjust rating criteria AFTER processing by reading Kull's detailed scores:

```swift
// Read XMP file
let xmpContent = try String(contentsOf: xmpURL)

// Extract Kull scores
let sharpness = extractScore(xmpContent, tag: "kull:Sharpness") // e.g., 950
let emotion = extractScore(xmpContent, tag: "kull:EmotionIntensity") // e.g., 875

// Apply new weights
let userWeights = RatingWeights(
    focusAccuracy: 2.0,  // Double importance
    emotionIntensity: 0.5  // Half importance
)

let newScore = (sharpness * userWeights.focusAccuracy) + (emotion * userWeights.emotionIntensity)

// Update star rating
let newStars = scoreToStars(newScore)

// Write updated XMP
updateXMP(xmpURL, newRating: newStars)
```

## Compatibility Notes

### Tested With

- Adobe Lightroom Classic 13.x (macOS)
- Adobe Lightroom Classic 12.x (Windows)
- Adobe Lightroom CC (Cloud)
- Lightroom Mobile (iOS/Android via cloud sync)

### Known Limitations

1. **Lightroom Classic on Windows:** May require "Metadata > Read Metadata from Files" if XMP created after import
2. **Lightroom CC:** Requires sync to cloud, then downloads metadata
3. **Custom Kull fields:** Not visible in Lightroom UI (stored for Kull app use only)

### Alternate Workflows

**If XMP sidecars not detected:**

1. In Lightroom: Select photos
2. Metadata > Read Metadata from Files
3. Lightroom re-reads XMP sidecars

**If editing XMP manually:**

1. Edit .xmp file in text editor
2. Save changes
3. In Lightroom: Metadata > Read Metadata from Files

## Implementation Files

- **macOS:** `/apps/Kull Universal App/kull/kull/RunController.swift`
  - Writes XMP directly next to RAW files using `XMPWriter.writeSidecar()`

- **iOS:** `/apps/Kull Universal App/kull/kull/RunController+iOS.swift`
  - Generates XMP in sandbox via `generateXMPSidecar()`
  - Presents share sheet for user to save back to original location

- **Tests:** `/apps/Kull Universal App/kull/kullTests/RunControllerTests.swift`
  - Platform-specific XMP generation tests
  - XML escaping verification
  - Lightroom field mapping tests

## Future Enhancements

1. **XMP Reading:** Parse existing XMP files to preserve user edits
2. **Batch Re-Ranking:** UI to adjust weights and regenerate stars for entire shoot
3. **Export Presets:** Save weight configurations for different shoot types
4. **Lightroom Plugin:** Direct integration to skip XMP file step

---

**Last Updated:** 2025-11-18
**Version:** 1.0
**Author:** Agent 9 - iOS Run Controller Implementation
