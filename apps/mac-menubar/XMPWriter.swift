import Foundation

enum XMPWriter {
    static func writeSidecar(for rawURL: URL, rating: Int, color: String?, title: String?, description: String?, tags: [String]?) throws {
        let xmpURL = rawURL.deletingPathExtension().appendingPathExtension("xmp")
        let xml = buildXMP(rating: rating, color: color, title: title, description: description, tags: tags)
        try xml.data(using: .utf8)?.write(to: xmpURL, options: .atomic)
    }

    private static func buildXMP(rating: Int, color: String?, title: String?, description: String?, tags: [String]?) -> String {
        let escapedTitle = title?.xmlEscaped() ?? ""
        let escapedDesc = description?.xmlEscaped() ?? ""
        let tagsXml = (tags ?? []).map { "<rdf:li>\($0.xmlEscaped())</rdf:li>" }.joined()
        let colorAttr = (color != nil && color != "none") ? "photoshop:ColorLabels=\"\(color!)\"" : ""
        return """
        <x:xmpmeta xmlns:x=\"adobe:ns:meta/\">
          <rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\">
            <rdf:Description xmlns:xmp=\"http://ns.adobe.com/xap/1.0/\" xmlns:photoshop=\"http://ns.adobe.com/photoshop/1.0/\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmp:Rating=\"\(rating)\" \(colorAttr)>
              \(escapedTitle.isEmpty ? "" : "<dc:title>\(escapedTitle)</dc:title>")
              \(escapedDesc.isEmpty ? "" : "<dc:description>\(escapedDesc)</dc:description>")
              \(tagsXml.isEmpty ? "" : "<dc:subject>\(tagsXml)</dc:subject>")
            </rdf:Description>
          </rdf:RDF>
        </x:xmpmeta>
        """.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

private extension String {
    func xmlEscaped() -> String {
        self
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
    }
}

