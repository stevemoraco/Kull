//
//  WebSocketService.swift
//  kull - Native WebSocket Real-Time Sync
//
//  Created by Claude Code on 11/18/25.
//

import Foundation
import Combine

@MainActor
final class WebSocketService: ObservableObject {
    // MARK: - Singleton

    static let shared = WebSocketService()

    // MARK: - Published Properties

    @Published private(set) var isConnected = false
    @Published private(set) var lastSyncTime: Date?
    @Published private(set) var connectionState: ConnectionState = .disconnected

    enum ConnectionState: Equatable {
        case disconnected
        case connecting
        case connected
        case reconnecting(attempt: Int)
        case failed(error: String)
    }

    // MARK: - Private Properties

    private var webSocketTask: URLSessionWebSocketTask?
    private var pingTimer: Timer?
    private var reconnectTimer: Timer?
    private var messageHandlers: [String: (Data) -> Void] = [:]
    private var reconnectAttempts = 0
    private let maxReconnectAttempts = 10
    private var shouldReconnect = false

    // Connection parameters
    private var currentUserId: String?
    private var currentDeviceId: String?

    // MARK: - Configuration

    private let pingInterval: TimeInterval = 30.0
    private let reconnectDelays: [TimeInterval] = [1, 2, 4, 8, 16, 32, 60, 60, 60, 60]

    // MARK: - Initialization

    private init() {
        // Listen for environment changes
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(environmentDidChange),
            name: .environmentDidChange,
            object: nil
        )
    }

    deinit {
        disconnect()
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: - Public Methods

    func connect(userId: String, deviceId: String) {
        Task { @MainActor in
            // Store connection parameters
            currentUserId = userId
            currentDeviceId = deviceId
            shouldReconnect = true
            reconnectAttempts = 0

            // Start connection
            await performConnect()
        }
    }

    func disconnect() {
        Task { @MainActor in
            shouldReconnect = false
            stopPingTimer()
            stopReconnectTimer()

            webSocketTask?.cancel(with: .goingAway, reason: nil)
            webSocketTask = nil

            connectionState = .disconnected
            isConnected = false
        }
    }

    func registerHandler<T: Codable>(for type: SyncMessageType, handler: @escaping (T) -> Void) {
        let key = type.rawValue
        messageHandlers[key] = { [weak self] data in
            do {
                let decoder = JSONDecoder()
                let message = try decoder.decode(SyncMessage<T>.self, from: data)
                Task { @MainActor in
                    handler(message.data)
                    self?.lastSyncTime = Date()
                }
            } catch {
                print("[WebSocket] Failed to decode message for type \(type): \(error)")
            }
        }
    }

    func send<T: Codable>(type: WebSocketClientMessageType, payload: T?) {
        Task {
            do {
                let message = WebSocketClientMessage(type: type, payload: payload)
                let encoder = JSONEncoder()
                let data = try encoder.encode(message)
                let string = String(data: data, encoding: .utf8) ?? ""

                try await webSocketTask?.send(.string(string))
            } catch {
                print("[WebSocket] Failed to send message: \(error)")
            }
        }
    }

    // MARK: - Private Methods

    private func performConnect() async {
        guard let userId = currentUserId,
              let deviceId = currentDeviceId else {
            connectionState = .failed(error: "Missing userId or deviceId")
            return
        }

        // Clean up existing connection
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        stopPingTimer()

        // Update state
        if reconnectAttempts > 0 {
            connectionState = .reconnecting(attempt: reconnectAttempts)
        } else {
            connectionState = .connecting
        }
        isConnected = false

        // Build WebSocket URL
        let baseURL = EnvironmentConfig.shared.websocketURL
        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
            connectionState = .failed(error: "Invalid WebSocket URL")
            return
        }

        components.path = "/ws"
        components.queryItems = [URLQueryItem(name: "token", value: "\(userId):\(deviceId)")]

        guard let url = components.url else {
            connectionState = .failed(error: "Failed to build WebSocket URL")
            return
        }

        print("[WebSocket] Connecting to \(url.absoluteString)")

        // Create WebSocket task
        let session = URLSession(configuration: .default)
        webSocketTask = session.webSocketTask(with: url)

        // Start receiving messages
        receiveMessage()

        // Resume connection
        webSocketTask?.resume()

        // Start ping timer
        startPingTimer()

        // Update connection state (optimistic)
        connectionState = .connected
        isConnected = true
        reconnectAttempts = 0

        print("[WebSocket] Connected successfully")
    }

    private func receiveMessage() {
        webSocketTask?.receive { [weak self] result in
            guard let self = self else { return }

            Task { @MainActor in
                switch result {
                case .success(let message):
                    await self.handleMessage(message)
                    // Continue receiving
                    self.receiveMessage()

                case .failure(let error):
                    print("[WebSocket] Receive error: \(error)")
                    await self.handleDisconnection()
                }
            }
        }
    }

    private func handleMessage(_ message: URLSessionWebSocketTask.Message) async {
        switch message {
        case .string(let text):
            guard let data = text.data(using: .utf8) else { return }
            await processMessage(data)

        case .data(let data):
            await processMessage(data)

        @unknown default:
            print("[WebSocket] Unknown message type received")
        }
    }

    private func processMessage(_ data: Data) async {
        do {
            // First decode the generic message to get the type
            let decoder = JSONDecoder()
            let genericMessage = try decoder.decode(GenericSyncMessage.self, from: data)

            // Handle PONG specially
            if genericMessage.type == .pong {
                lastSyncTime = Date()
                return
            }

            // Route to appropriate handler
            let key = genericMessage.type.rawValue
            if let handler = messageHandlers[key] {
                handler(data)
            } else {
                print("[WebSocket] No handler registered for message type: \(genericMessage.type)")
            }

        } catch {
            print("[WebSocket] Failed to process message: \(error)")
        }
    }

    private func handleDisconnection() async {
        isConnected = false

        guard shouldReconnect else {
            connectionState = .disconnected
            return
        }

        guard reconnectAttempts < maxReconnectAttempts else {
            connectionState = .failed(error: "Max reconnection attempts reached")
            return
        }

        // Schedule reconnection with exponential backoff
        let delay = reconnectDelays[min(reconnectAttempts, reconnectDelays.count - 1)]
        reconnectAttempts += 1

        print("[WebSocket] Scheduling reconnection attempt \(reconnectAttempts) in \(delay)s")

        connectionState = .reconnecting(attempt: reconnectAttempts)

        stopReconnectTimer()
        reconnectTimer = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak self] _ in
            guard let self = self else { return }
            Task { @MainActor in
                await self.performConnect()
            }
        }
    }

    @objc private func environmentDidChange() {
        Task { @MainActor in
            // Reconnect with new environment
            if let userId = currentUserId, let deviceId = currentDeviceId {
                disconnect()
                connect(userId: userId, deviceId: deviceId)
            }
        }
    }

    // MARK: - Ping/Pong Timer

    private func startPingTimer() {
        stopPingTimer()

        pingTimer = Timer.scheduledTimer(withTimeInterval: pingInterval, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            Task { @MainActor in
                await self.sendPing()
            }
        }
    }

    private func stopPingTimer() {
        pingTimer?.invalidate()
        pingTimer = nil
    }

    private func stopReconnectTimer() {
        reconnectTimer?.invalidate()
        reconnectTimer = nil
    }

    private func sendPing() async {
        let payload = PingPayload(timestamp: Date().timeIntervalSince1970)
        send(type: .ping, payload: payload)
    }
}
