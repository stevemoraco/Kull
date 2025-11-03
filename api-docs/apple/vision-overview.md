Framework

# Vision

Apply computer vision algorithms to perform a variety of tasks on input images and videos.

## [Overview](/documentation/vision#overview)

The Vision framework combines machine learning technologies and Swift’s concurrency features to perform computer vision tasks in your app. Use the Vision framework to analyze images for a variety of purposes:

*   Tracking human and animal body poses or the trajectory of an object
    
*   Recognizing text in 18 different languages
    
*   Detecting faces and face landmarks, such as eyes, nose, and mouth
    
*   Performing hand tracking to enable new device interactions
    
*   Calculating an aesthetics score to determine how memorable a photo is
    

![An illustration showing a dog, and a magnifying glass depicting the dog being analyzed.](https://docs-assets.developer.apple.com/published/c745ff2988bec9749a8ba2313d77598e/vision-framework%402x.png)

To begin using the framework, you create a request for the type of analysis you want to do. Each request conforms to the [`VisionRequest`](/documentation/vision/visionrequest) protocol. You then perform the request to get an observation object — or an array of observations — with the analysis details for the request. There are more than 25 requests available to choose from. Vision also allows the use of custom Core ML models for tasks like classification or object detection.

Note

Starting in iOS 18.0, the Vision framework provides a new Swift-only API. See [Original Objective-C and Swift API](/documentation/vision/original-objective-c-and-swift-api) to view the original API.

## [Topics](/documentation/vision#topics)

### [Still-image analysis](/documentation/vision#Still-image-analysis)

[

Classifying images for categorization and search](/documentation/vision/classifying-images-for-categorization-and-search)

Analyze and label images using a Vision classification request.

[`struct ClassifyImageRequest`](/documentation/vision/classifyimagerequest)

A request to classify an image.

[`protocol ImageProcessingRequest`](/documentation/vision/imageprocessingrequest)

A type for image-analysis requests that focus on a specific part of an image.

[`class ImageRequestHandler`](/documentation/vision/imagerequesthandler)

An object that processes one or more image-analysis requests pertaining to a single image.

[`protocol VisionRequest`](/documentation/vision/visionrequest)

A type for image-analysis requests.

[`protocol VisionObservation`](/documentation/vision/visionobservation)

A type for objects produced by image-analysis requests.

[`struct DetectLensSmudgeRequest`](/documentation/vision/detectlenssmudgerequest)

A request that detects a smudge on a lens from an image or video frame capture.

[`struct SmudgeObservation`](/documentation/vision/smudgeobservation)

An observation that provides an overall score of the presence of a smudge in an image or video frame capture.

### [Image sequence analysis](/documentation/vision#Image-sequence-analysis)

[`class GeneratePersonSegmentationRequest`](/documentation/vision/generatepersonsegmentationrequest)

A request that produces a matte image for a person it finds in the input image.

[`struct GeneratePersonInstanceMaskRequest`](/documentation/vision/generatepersoninstancemaskrequest)

A request that produces a mask of individual people it finds in the input image.

[`struct DetectDocumentSegmentationRequest`](/documentation/vision/detectdocumentsegmentationrequest)

A request that detects rectangular regions that contain text in the input image.

[`protocol StatefulRequest`](/documentation/vision/statefulrequest)

The protocol for a type that builds evidence of a condition over time.

### [Image aesthetics analysis](/documentation/vision#Image-aesthetics-analysis)

[

Generating high-quality thumbnails from videos](/documentation/vision/generating-thumbnails-from-videos)

Identify the most visually pleasing frames in a video by using the image-aesthetics scores request.

[`struct CalculateImageAestheticsScoresRequest`](/documentation/vision/calculateimageaestheticsscoresrequest)

A request that analyzes an image for aesthetically pleasing attributes.

### [Saliency analysis](/documentation/vision#Saliency-analysis)

[`struct GenerateAttentionBasedSaliencyImageRequest`](/documentation/vision/generateattentionbasedsaliencyimagerequest)

An object that produces a heat map that identifies the parts of an image most likely to draw attention.

[`struct GenerateObjectnessBasedSaliencyImageRequest`](/documentation/vision/generateobjectnessbasedsaliencyimagerequest)

A request that generates a heat map that identifies the parts of an image most likely to represent objects.

### [Object tracking](/documentation/vision#Object-tracking)

[`class TrackObjectRequest`](/documentation/vision/trackobjectrequest)

An image-analysis request that tracks the movement of a previously identified object across multiple images or video frames.

[`class TrackRectangleRequest`](/documentation/vision/trackrectanglerequest)

An image-analysis request that tracks movement of a previously identified rectangular object across multiple images or video frames.

### [Face and body detection](/documentation/vision#Face-and-body-detection)

[

Analyzing a selfie and visualizing its content](/documentation/vision/analyzing-a-selfie-and-visualizing-its-content)

Calculate face-capture quality and visualize facial features for a collection of images using the Vision framework.

[`struct DetectFaceRectanglesRequest`](/documentation/vision/detectfacerectanglesrequest)

A request that finds faces within an image.

[`struct DetectFaceLandmarksRequest`](/documentation/vision/detectfacelandmarksrequest)

An image-analysis request that finds facial features like eyes and mouth in an image.

[`struct DetectFaceCaptureQualityRequest`](/documentation/vision/detectfacecapturequalityrequest)

A request that produces a floating-point number that represents the capture quality of a face in a photo.

[`struct DetectHumanRectanglesRequest`](/documentation/vision/detecthumanrectanglesrequest)

A request that finds rectangular regions that contain people in an image.

### [Body and hand pose detection](/documentation/vision#Body-and-hand-pose-detection)

[`struct DetectHumanBodyPoseRequest`](/documentation/vision/detecthumanbodyposerequest)

A request that detects a human body pose.

[`struct DetectHumanHandPoseRequest`](/documentation/vision/detecthumanhandposerequest)

A request that detects a human hand pose.

[`protocol PoseProviding`](/documentation/vision/poseproviding)

An observation that provides a collection of joints that make up a pose.

[`enum Chirality`](/documentation/vision/chirality)

The hand sidedness of a pose.

[`struct Joint`](/documentation/vision/joint)

A pose joint represented as a normalized point in an image, along with a label and a confidence value.

### [3D body pose detection](/documentation/vision#3D-body-pose-detection)

[`class DetectHumanBodyPose3DRequest`](/documentation/vision/detecthumanbodypose3drequest)

A request that detects points on human bodies in 3D space, relative to the camera.

[`struct Joint3D`](/documentation/vision/joint3d)

An object that represents a body pose joint in 3D space.

### [Text detection](/documentation/vision#Text-detection)

[

Recognizing tables within a document](/documentation/vision/recognize-tables-within-a-document)

Scan a document containing a contact table and extract the content within the table in a formatted way.

[

Locating and displaying recognized text](/documentation/vision/locating-and-displaying-recognized-text)

Perform text recognition on a photo using the Vision framework’s text-recognition request.

[`struct RecognizeDocumentsRequest`](/documentation/vision/recognizedocumentsrequest)

An image-analysis request to scan an image of a document and provide information about its structure.

[`struct DocumentObservation`](/documentation/vision/documentobservation)

Information about the sections of content that an image-analysis request detects in a document.

[`struct DetectTextRectanglesRequest`](/documentation/vision/detecttextrectanglesrequest)

An image-analysis request that finds regions of visible text in an image.

[`struct RecognizeTextRequest`](/documentation/vision/recognizetextrequest)

An image-analysis request that recognizes text in an image.

### [Barcode detection](/documentation/vision#Barcode-detection)

[`struct DetectBarcodesRequest`](/documentation/vision/detectbarcodesrequest)

A request that detects barcodes in an image.

### [Trajectory, contour, and horizon detection](/documentation/vision#Trajectory-contour-and-horizon-detection)

[`class DetectTrajectoriesRequest`](/documentation/vision/detecttrajectoriesrequest)

A request that detects the trajectories of shapes moving along a parabolic path.

[`struct DetectContoursRequest`](/documentation/vision/detectcontoursrequest)

A request that detects the contours of the edges of an image.

[`struct DetectHorizonRequest`](/documentation/vision/detecthorizonrequest)

An image-analysis request that determines the horizon angle in an image.

### [Animal detection](/documentation/vision#Animal-detection)

[`struct DetectAnimalBodyPoseRequest`](/documentation/vision/detectanimalbodyposerequest)

A request that detects an animal body pose.

[`struct RecognizeAnimalsRequest`](/documentation/vision/recognizeanimalsrequest)

A request that recognizes animals in an image.

### [Optical flow and rectangle detection](/documentation/vision#Optical-flow-and-rectangle-detection)

[`class TrackOpticalFlowRequest`](/documentation/vision/trackopticalflowrequest)

A request that determines the direction change of vectors for each pixel from a previous to current image.

[`struct DetectRectanglesRequest`](/documentation/vision/detectrectanglesrequest)

An image-analysis request that finds projected rectangular regions in an image.

### [Image alignment](/documentation/vision#Image-alignment)

[`class TrackTranslationalImageRegistrationRequest`](/documentation/vision/tracktranslationalimageregistrationrequest)

An image-analysis request that you track over time to determine the affine transform necessary to align the content of two images.

[`class TrackHomographicImageRegistrationRequest`](/documentation/vision/trackhomographicimageregistrationrequest)

An image-analysis request that you track over time to determine the perspective warp matrix necessary to align the content of two images.

[`protocol TargetedRequest`](/documentation/vision/targetedrequest)

A type for analyzing two images together.

### [Image feature print and background removal](/documentation/vision#Image-feature-print-and-background-removal)

[`struct GenerateImageFeaturePrintRequest`](/documentation/vision/generateimagefeatureprintrequest)

An image-based request to generate feature prints from an image.

[`struct GenerateForegroundInstanceMaskRequest`](/documentation/vision/generateforegroundinstancemaskrequest)

A request that generates an instance mask of noticeable objects to separate from the background.

### [Machine learning image analysis](/documentation/vision#Machine-learning-image-analysis)

[`struct CoreMLRequest`](/documentation/vision/coremlrequest)

An image-analysis request that uses a Core ML model to process images.

[`struct CoreMLFeatureValueObservation`](/documentation/vision/coremlfeaturevalueobservation)

An object that represents a collection of key-value information that a Core ML image-analysis request produces.

[`struct ClassificationObservation`](/documentation/vision/classificationobservation)

An object that represents classification information that an image-analysis request produces.

[`struct PixelBufferObservation`](/documentation/vision/pixelbufferobservation)

An object that represents an image that an image-analysis request produces.

### [Image locations and regions](/documentation/vision#Image-locations-and-regions)

[`struct NormalizedPoint`](/documentation/vision/normalizedpoint)

A point in a 2D coordinate system.

[`struct NormalizedRect`](/documentation/vision/normalizedrect)

The location and dimensions of a rectangle.

[`typealias NormalizedRegion`](/documentation/vision/normalizedregion)

A polygon composed of normalized points.

[`struct NormalizedCircle`](/documentation/vision/normalizedcircle)

The center point and radius of a 2D circle.

[`protocol BoundingBoxProviding`](/documentation/vision/boundingboxproviding)

A protocol for objects that have a bounding box.

[`protocol BoundingRegionProviding`](/documentation/vision/boundingregionproviding)

A protocol for objects that have a defined boundary in an image.

[`protocol QuadrilateralProviding`](/documentation/vision/quadrilateralproviding)

A protocol for objects that have a bounding quadrilateral.

[`enum CoordinateOrigin`](/documentation/vision/coordinateorigin)

The origin of a coordinate system relative to an image.

### [Request Handlers](/documentation/vision#Request-Handlers)

[`class ImageRequestHandler`](/documentation/vision/imagerequesthandler)

An object that processes one or more image-analysis requests pertaining to a single image.

[`class TargetedImageRequestHandler`](/documentation/vision/targetedimagerequesthandler)

An object that performs image-analysis requests on two images.

### [Utilities](/documentation/vision#Utilities)

[`enum ComputeStage`](/documentation/vision/computestage)

Types that represent the compute stage.

[`class VideoProcessor`](/documentation/vision/videoprocessor)

An object that performs offline analysis of video content.

### [Errors](/documentation/vision#Errors)

[`enum VisionError`](/documentation/vision/visionerror)

The errors that the framework produces.

### [Legacy API](/documentation/vision#Legacy-API)

[

API Reference

Original Objective-C and Swift API](/documentation/vision/original-objective-c-and-swift-api)