import Foundation
import ImageIO
import CoreLocation

struct ExifData {
    var captureDate: Date?
    var cameraMake: String?
    var cameraModel: String?
    var lensModel: String?
    var width: Int?
    var height: Int?
    var gps: CLLocationCoordinate2D?
}

enum ExifReader {
    static func read(from url: URL) -> ExifData {
        guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
              let props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any]
        else { return ExifData() }

        var out = ExifData()
        if let pixelW = props[kCGImagePropertyPixelWidth] as? Int { out.width = pixelW }
        if let pixelH = props[kCGImagePropertyPixelHeight] as? Int { out.height = pixelH }

        if let tiff = props[kCGImagePropertyTIFFDictionary] as? [CFString: Any] {
            out.cameraMake = tiff[kCGImagePropertyTIFFMake] as? String
            out.cameraModel = tiff[kCGImagePropertyTIFFModel] as? String
        }
        if let exif = props[kCGImagePropertyExifDictionary] as? [CFString: Any] {
            if let lens = exif[kCGImagePropertyExifLensModel] as? String { out.lensModel = lens }
            if let dateStr = exif[kCGImagePropertyExifDateTimeOriginal] as? String {
                let fmt = DateFormatter(); fmt.dateFormat = "yyyy:MM:dd HH:mm:ss"; fmt.timeZone = .current
                out.captureDate = fmt.date(from: dateStr)
            }
        }
        if let gps = props[kCGImagePropertyGPSDictionary] as? [CFString: Any] {
            if let lat = gps[kCGImagePropertyGPSLatitude] as? Double,
               let latRef = gps[kCGImagePropertyGPSLatitudeRef] as? String,
               let lon = gps[kCGImagePropertyGPSLongitude] as? Double,
               let lonRef = gps[kCGImagePropertyGPSLongitudeRef] as? String {
                let adjLat = (latRef == "S") ? -lat : lat
                let adjLon = (lonRef == "W") ? -lon : lon
                out.gps = CLLocationCoordinate2D(latitude: adjLat, longitude: adjLon)
            }
        }
        return out
    }
}

