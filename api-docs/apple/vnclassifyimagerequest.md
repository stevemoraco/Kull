*   [Vision](/documentation/vision)
*   VNClassifyImageRequest

Class

# VNClassifyImageRequest

A request to classify an image.

iOS 13.0+iPadOS 13.0+Mac Catalyst 13.1+macOS 10.15+tvOS 13.0+visionOS 1.0+

```
class VNClassifyImageRequest
```

## [Overview](/documentation/vision/vnclassifyimagerequest#overview)

This type of request produces a collection of [`VNClassificationObservation`](/documentation/vision/vnclassificationobservation) objects that describe an image. Access the classifications through [`knownClassifications(forRevision:)`](/documentation/vision/vnclassifyimagerequest/knownclassifications\(forrevision:\)).

## [Topics](/documentation/vision/vnclassifyimagerequest#topics)

### [Accessing Results](/documentation/vision/vnclassifyimagerequest#Accessing-Results)

[`func supportedIdentifiers() throws -> [String]`](/documentation/vision/vnclassifyimagerequest/supportedidentifiers\(\))

Returns the classification identifiers that the request supports in its current configuration.

[`var results: [VNClassificationObservation]?`](/documentation/vision/vnclassifyimagerequest/results)

The results of the image classification request.

[`class VNClassificationObservation`](/documentation/vision/vnclassificationobservation)

An object that represents classification information that an image-analysis request produces.

[`class func knownClassifications(forRevision: Int) throws -> [VNClassificationObservation]`](/documentation/vision/vnclassifyimagerequest/knownclassifications\(forrevision:\))

Requests the collection of classifications that the Vision framework recognizes.

Deprecated

### [Specifying Algorithm Revision](/documentation/vision/vnclassifyimagerequest#Specifying-Algorithm-Revision)

[`let VNClassifyImageRequestRevision1: Int`](/documentation/vision/vnclassifyimagerequestrevision1)

A constant for specifying the first revision of the image-classification request.

## [Relationships](/documentation/vision/vnclassifyimagerequest#relationships)

### [Inherits From](/documentation/vision/vnclassifyimagerequest#inherits-from)

*   [`VNImageBasedRequest`](/documentation/vision/vnimagebasedrequest)

### [Conforms To](/documentation/vision/vnclassifyimagerequest#conforms-to)

*   [`CVarArg`](/documentation/Swift/CVarArg)
*   [`CustomDebugStringConvertible`](/documentation/Swift/CustomDebugStringConvertible)
*   [`CustomStringConvertible`](/documentation/Swift/CustomStringConvertible)
*   [`Equatable`](/documentation/Swift/Equatable)
*   [`Hashable`](/documentation/Swift/Hashable)
*   [`NSCopying`](/documentation/Foundation/NSCopying)
*   [`NSObjectProtocol`](/documentation/ObjectiveC/NSObjectProtocol)

## [See Also](/documentation/vision/vnclassifyimagerequest#see-also)

### [Still-image analysis](/documentation/vision/vnclassifyimagerequest#Still-image-analysis)

[

Detecting Objects in Still Images](/documentation/vision/detecting-objects-in-still-images)

Locate and demarcate rectangles, faces, barcodes, and text in images using the Vision framework.

[

Classifying images for categorization and search](/documentation/vision/classifying-images-for-categorization-and-search)

Analyze and label images using a Vision classification request.

[

Analyzing Image Similarity with Feature Print](/documentation/vision/analyzing-image-similarity-with-feature-print)

Generate a feature print to compute distance between images.

[`class VNRequest`](/documentation/vision/vnrequest)

The abstract superclass for analysis requests.

[`class VNImageBasedRequest`](/documentation/vision/vnimagebasedrequest)

The abstract superclass for image-analysis requests that focus on a specific part of an image.

[`class VNGenerateImageFeaturePrintRequest`](/documentation/vision/vngenerateimagefeatureprintrequest)

An image-based request to generate feature prints from an image.

[`class VNFeaturePrintObservation`](/documentation/vision/vnfeatureprintobservation)

An observation that provides the recognized feature print.

[`class VNImageRequestHandler`](/documentation/vision/vnimagerequesthandler)

An object that processes one or more image-analysis request pertaining to a single image.

[`class VNObservation`](/documentation/vision/vnobservation)

The abstract superclass for analysis results.