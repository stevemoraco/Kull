import Foundation
import CoreLocation

final class GeoResolver: NSObject, CLLocationManagerDelegate {
    private let geocoder = CLGeocoder()

    func resolve(coordinate: CLLocationCoordinate2D) async -> (address: String?, nearby: [String]) {
        let location = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        do {
            let placemarks = try await geocoder.reverseGeocodeLocation(location)
            let addr = placemarks.first?.name ?? placemarks.first?.locality
            // Placeholder for POI discovery – could integrate MapKit Look Around or MKLocalSearch
            return (addr, [])
        } catch {
            return (nil, [])
        }
    }
}

