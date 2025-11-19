//
//  TranscriptionHelper.swift
//  kull - Universal App for macOS, iOS, and iPadOS
//
//  Audio transcription service using OpenAI Whisper API
//  Supports both macOS (NSOpenPanel) and iOS (UIDocumentPickerViewController)
//  Handles security-scoped resource access on iOS
//

import Foundation
import Combine
import OSLog

#if os(macOS)
import AppKit
#elseif os(iOS)
import UIKit
#endif

final class TranscriptionHelper: ObservableObject {

    // MARK: - Public Methods

    /// Transcribe audio file using OpenAI Whisper API
    /// - Parameters:
    ///   - currentText: Closure that returns current text content
    ///   - update: Closure to update text with transcription result
    func transcribe(currentText: @escaping () -> String, update: @escaping (String) -> Void) {
        // Use Agent 6's FileAccessService (works on both platforms!)
        FileAccessService.shared.selectAudioFile { [weak self] url in
            guard let self = self, let url = url else { return }

            Task { @MainActor in
                do {
                    let transcription = try await self.upload(url: url)
                    let combined = (currentText() + "\n" + transcription)
                        .trimmingCharacters(in: .whitespacesAndNewlines)
                    update(combined)
                } catch {
                    Logger.errors.error("Transcription failed: \(error.localizedDescription)")
                    ErrorPresenter.shared.present(error)
                }
            }
        }
    }

    // MARK: - Private Methods

    /// Upload audio to backend for Whisper transcription
    /// - Parameter url: URL of audio file to transcribe
    /// - Returns: Transcribed text
    /// - Throws: TranscriptionError on failure
    private func upload(url: URL) async throws -> String {
        // Read audio file data with platform-specific handling
        let audioData: Data

        #if os(macOS)
        // Direct access on macOS
        audioData = try Data(contentsOf: url)
        #elseif os(iOS)
        // iOS may need security-scoped access
        guard url.startAccessingSecurityScopedResource() else {
            throw TranscriptionError.accessDenied
        }
        defer { url.stopAccessingSecurityScopedResource() }
        audioData = try Data(contentsOf: url)
        #endif

        // Construct API endpoint
        let baseURL = EnvironmentConfig.shared.apiBaseURL
        guard let apiURL = URL(string: "\(baseURL.absoluteString)/api/transcribe") else {
            throw TranscriptionError.invalidURL
        }

        // Create request
        var request = URLRequest(url: apiURL)
        request.httpMethod = "POST"
        request.timeoutInterval = 60 // Transcription may take time

        // Add authentication token
        let deviceId = DeviceIDManager.shared.deviceID
        guard let token = KeychainManager.shared.getAccessToken(for: deviceId) else {
            Logger.errors.error("Failed to get access token for transcription")
            throw TranscriptionError.authenticationFailed
        }
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        // Create multipart body
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)",
                        forHTTPHeaderField: "Content-Type")

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(url.lastPathComponent)\"\r\n".data(using: .utf8)!)

        // Determine content type from file extension
        let contentType = self.contentType(for: url.pathExtension)
        body.append("Content-Type: \(contentType)\r\n\r\n".data(using: .utf8)!)
        body.append(audioData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        // Upload to backend
        let (data, response) = try await URLSession.shared.data(for: request)

        // Validate response
        guard let httpResponse = response as? HTTPURLResponse else {
            throw TranscriptionError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            // Try to parse error message from response
            if let errorJson = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let errorMessage = errorJson["error"] as? String {
                Logger.errors.error("Transcription API error: \(errorMessage)")
            }
            throw TranscriptionError.uploadFailed(statusCode: httpResponse.statusCode)
        }

        // Parse response
        let result = try JSONDecoder().decode(TranscriptionResponse.self, from: data)

        Logger.general.info("Transcription successful: \(result.text.prefix(100))...")
        return result.text
    }

    /// Get MIME content type for audio file extension
    /// - Parameter fileExtension: File extension (e.g., "m4a", "mp3")
    /// - Returns: MIME type string
    private func contentType(for fileExtension: String) -> String {
        switch fileExtension.lowercased() {
        case "m4a":
            return "audio/m4a"
        case "mp3":
            return "audio/mpeg"
        case "wav":
            return "audio/wav"
        case "webm":
            return "audio/webm"
        default:
            return "application/octet-stream"
        }
    }
}

// MARK: - Response Model

struct TranscriptionResponse: Codable {
    let text: String
}

// MARK: - Error Types

enum TranscriptionError: LocalizedError {
    case accessDenied
    case authenticationFailed
    case invalidURL
    case invalidResponse
    case uploadFailed(statusCode: Int)

    var errorDescription: String? {
        switch self {
        case .accessDenied:
            return "Could not access audio file. Please check app permissions."
        case .authenticationFailed:
            return "Authentication failed. Please sign in again."
        case .invalidURL:
            return "Invalid transcription API URL"
        case .invalidResponse:
            return "Invalid response from transcription service"
        case .uploadFailed(let statusCode):
            return "Failed to upload audio for transcription (HTTP \(statusCode))"
        }
    }
}
