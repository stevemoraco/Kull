*   [Vision](/documentation/vision)
*   VNRecognizeTextRequest

Class

# VNRecognizeTextRequest

An image-analysis request that finds and recognizes text in an image.

iOS 13.0+iPadOS 13.0+Mac Catalyst 13.1+macOS 10.15+tvOS 13.0+visionOS 1.0+

```
class VNRecognizeTextRequest
```

## [Mentioned in](/documentation/vision/vnrecognizetextrequest#mentions)

[

Recognizing Text in Images](/documentation/vision/recognizing-text-in-images)

## [Overview](/documentation/vision/vnrecognizetextrequest#overview)

By default, a text recognition request first locates all possible glyphs or characters in the input image, and then analyzes each string. To specify or limit the languages to find in the request, set the [`recognitionLanguages`](/documentation/vision/vnrecognizetextrequest/recognitionlanguages) property to an array that contains the names of the languages of text you want to recognize. Vision returns the result of this request in a [`VNRecognizedTextObservation`](/documentation/vision/vnrecognizedtextobservation) object.

## [Topics](/documentation/vision/vnrecognizetextrequest#topics)

### [Customizing Recognition Constraints](/documentation/vision/vnrecognizetextrequest#Customizing-Recognition-Constraints)

[`var minimumTextHeight: Float`](/documentation/vision/vnrecognizetextrequest/minimumtextheight)

The minimum height, relative to the image height, of the text to recognize.

[`var recognitionLevel: VNRequestTextRecognitionLevel`](/documentation/vision/vnrecognizetextrequest/recognitionlevel)

A value that determines whether the request prioritizes accuracy or speed in text recognition.

[`enum VNRequestTextRecognitionLevel`](/documentation/vision/vnrequesttextrecognitionlevel)

Constants that identify the performance and accuracy of the text recognition.

### [Accessing the Results](/documentation/vision/vnrecognizetextrequest#Accessing-the-Results)

[`var results: [VNRecognizedTextObservation]?`](/documentation/vision/vnrecognizetextrequest/results)

The results of the text recognition request.

### [Specifying the Language](/documentation/vision/vnrecognizetextrequest#Specifying-the-Language)

[`var automaticallyDetectsLanguage: Bool`](/documentation/vision/vnrecognizetextrequest/automaticallydetectslanguage)

A Boolean value that indicates whether to attempt detecting the language to use the appropriate model for recognition and language correction.

[`var recognitionLanguages: [String]`](/documentation/vision/vnrecognizetextrequest/recognitionlanguages)

An array of languages to detect, in priority order.

[`var usesLanguageCorrection: Bool`](/documentation/vision/vnrecognizetextrequest/useslanguagecorrection)

A Boolean value that indicates whether the request applies language correction during the recognition process.

[`var customWords: [String]`](/documentation/vision/vnrecognizetextrequest/customwords)

An array of strings to supplement the recognized languages at the word-recognition stage.

[`func supportedRecognitionLanguages() throws -> [String]`](/documentation/vision/vnrecognizetextrequest/supportedrecognitionlanguages\(\))

Returns the identifiers of the languages that the request supports.

[`class func supportedRecognitionLanguages(for: VNRequestTextRecognitionLevel, revision: Int) throws -> [String]`](/documentation/vision/vnrecognizetextrequest/supportedrecognitionlanguages\(for:revision:\))

Requests a list of languages that the specified revision recognizes.

Deprecated

### [Identifying Request Revisions](/documentation/vision/vnrecognizetextrequest#Identifying-Request-Revisions)

[`let VNRecognizeTextRequestRevision3: Int`](/documentation/vision/vnrecognizetextrequestrevision3)

A constant for specifying revision 3 of the text recognition request.

[`let VNRecognizeTextRequestRevision2: Int`](/documentation/vision/vnrecognizetextrequestrevision2)

A constant for specifying revision 2 of the text recognition request.

Deprecated

[`let VNRecognizeTextRequestRevision1: Int`](/documentation/vision/vnrecognizetextrequestrevision1)

A constant for specifying revision 1 of the text recognition request.

Deprecated

## [Relationships](/documentation/vision/vnrecognizetextrequest#relationships)

### [Inherits From](/documentation/vision/vnrecognizetextrequest#inherits-from)

*   [`VNImageBasedRequest`](/documentation/vision/vnimagebasedrequest)

### [Conforms To](/documentation/vision/vnrecognizetextrequest#conforms-to)

*   [`CVarArg`](/documentation/Swift/CVarArg)
*   [`CustomDebugStringConvertible`](/documentation/Swift/CustomDebugStringConvertible)
*   [`CustomStringConvertible`](/documentation/Swift/CustomStringConvertible)
*   [`Equatable`](/documentation/Swift/Equatable)
*   [`Hashable`](/documentation/Swift/Hashable)
*   [`NSCopying`](/documentation/Foundation/NSCopying)
*   [`NSObjectProtocol`](/documentation/ObjectiveC/NSObjectProtocol)
*   [`VNRequestProgressProviding`](/documentation/vision/vnrequestprogressproviding)

## [See Also](/documentation/vision/vnrecognizetextrequest#see-also)

### [Text recognition](/documentation/vision/vnrecognizetextrequest#Text-recognition)

[

Recognizing Text in Images](/documentation/vision/recognizing-text-in-images)

Add text-recognition features to your app using the Vision framework.

[

Structuring Recognized Text on a Document](/documentation/visionkit/structuring_recognized_text_on_a_document)

Detect, recognize, and structure text on a business card or receipt using Vision and VisionKit.

[

Extracting phone numbers from text in images](/documentation/vision/extracting-phone-numbers-from-text-in-images)

Analyze and filter phone numbers from text in live capture by using Vision.

[

Locating and displaying recognized text](/documentation/vision/locating-and-displaying-recognized-text)

Perform text recognition on a photo using the Vision framework’s text-recognition request.

[`class VNRecognizedTextObservation`](/documentation/vision/vnrecognizedtextobservation)

A request that detects and recognizes regions of text in an image.