//
//  CacheManager.swift
//  kull - Universal App for macOS, iOS, and iPadOS
//
//  Created by Agent H on 11/18/25.
//  Manages offline caching of user data, credits, prompts, and reports
//

import Foundation

/// Manages offline caching using UserDefaults and FileManager
final class CacheManager {
    static let shared = CacheManager()

    private let userDefaults = UserDefaults.standard
    private let fileManager = FileManager.default

    // Cache keys
    private enum CacheKey: String {
        case userProfile = "cached_user_profile"
        case creditBalance = "cached_credit_balance"
        case creditSummary = "cached_credit_summary"
        case prompts = "cached_prompts"
        case reports = "cached_reports"
        case lastSyncDate = "last_sync_date"
    }

    private init() {
        setupCacheDirectory()
    }

    // MARK: - Cache Directory Setup

    private var cacheDirectory: URL {
        let cachesDirectory = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first!
        return cachesDirectory.appendingPathComponent("KullCache", isDirectory: true)
    }

    private func setupCacheDirectory() {
        if !fileManager.fileExists(atPath: cacheDirectory.path) {
            try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
        }
    }

    // MARK: - User Profile

    func cacheUserProfile(_ user: RemoteUser) {
        if let encoded = try? JSONEncoder().encode(user) {
            userDefaults.set(encoded, forKey: CacheKey.userProfile.rawValue)
            updateLastSyncDate()
        }
    }

    func getCachedUserProfile() -> RemoteUser? {
        guard let data = userDefaults.data(forKey: CacheKey.userProfile.rawValue),
              let user = try? JSONDecoder().decode(RemoteUser.self, from: data) else {
            return nil
        }
        return user
    }

    func clearUserProfile() {
        userDefaults.removeObject(forKey: CacheKey.userProfile.rawValue)
    }

    // MARK: - Credit Balance

    func cacheCreditBalance(_ balance: Int) {
        userDefaults.set(balance, forKey: CacheKey.creditBalance.rawValue)
        updateLastSyncDate()
    }

    func getCachedCreditBalance() -> Int? {
        guard userDefaults.object(forKey: CacheKey.creditBalance.rawValue) != nil else {
            return nil
        }
        return userDefaults.integer(forKey: CacheKey.creditBalance.rawValue)
    }

    func clearCreditBalance() {
        userDefaults.removeObject(forKey: CacheKey.creditBalance.rawValue)
    }

    // MARK: - Credit Summary

    func cacheCreditSummary(_ summary: CreditSummary) {
        if let encoded = try? JSONEncoder().encode(summary) {
            userDefaults.set(encoded, forKey: CacheKey.creditSummary.rawValue)
            updateLastSyncDate()
        }
    }

    func getCachedCreditSummary() -> CreditSummary? {
        guard let data = userDefaults.data(forKey: CacheKey.creditSummary.rawValue),
              let summary = try? JSONDecoder().decode(CreditSummary.self, from: data) else {
            return nil
        }
        return summary
    }

    func clearCreditSummary() {
        userDefaults.removeObject(forKey: CacheKey.creditSummary.rawValue)
    }

    // MARK: - Prompts

    func cachePrompts(_ prompts: [PromptPresetPayload]) {
        if let encoded = try? JSONEncoder().encode(prompts) {
            userDefaults.set(encoded, forKey: CacheKey.prompts.rawValue)
            updateLastSyncDate()
        }
    }

    func getCachedPrompts() -> [PromptPresetPayload] {
        guard let data = userDefaults.data(forKey: CacheKey.prompts.rawValue),
              let prompts = try? JSONDecoder().decode([PromptPresetPayload].self, from: data) else {
            return []
        }
        return prompts
    }

    func clearPrompts() {
        userDefaults.removeObject(forKey: CacheKey.prompts.rawValue)
    }

    // MARK: - Reports (Shoot Reports)

    func cacheReports(_ reports: [ShootReportPayload]) {
        if let encoded = try? JSONEncoder().encode(reports) {
            userDefaults.set(encoded, forKey: CacheKey.reports.rawValue)
            updateLastSyncDate()
        }
    }

    func getCachedReports() -> [ShootReportPayload] {
        guard let data = userDefaults.data(forKey: CacheKey.reports.rawValue),
              let reports = try? JSONDecoder().decode([ShootReportPayload].self, from: data) else {
            return []
        }
        return reports
    }

    func clearReports() {
        userDefaults.removeObject(forKey: CacheKey.reports.rawValue)
    }

    // MARK: - Image/Thumbnail Caching

    func cacheImage(_ imageData: Data, forKey key: String) {
        let url = cacheDirectory.appendingPathComponent(key)
        try? imageData.write(to: url)
    }

    func getCachedImage(forKey key: String) -> Data? {
        let url = cacheDirectory.appendingPathComponent(key)
        return try? Data(contentsOf: url)
    }

    func clearImage(forKey key: String) {
        let url = cacheDirectory.appendingPathComponent(key)
        try? fileManager.removeItem(at: url)
    }

    // MARK: - Cache Metadata

    func updateLastSyncDate() {
        userDefaults.set(Date(), forKey: CacheKey.lastSyncDate.rawValue)
    }

    func getLastSyncDate() -> Date? {
        return userDefaults.object(forKey: CacheKey.lastSyncDate.rawValue) as? Date
    }

    func isCacheStale(maxAgeSeconds: TimeInterval = 3600) -> Bool {
        guard let lastSync = getLastSyncDate() else {
            return true
        }
        return Date().timeIntervalSince(lastSync) > maxAgeSeconds
    }

    // MARK: - Clear All Cache

    func clearAllCache() {
        clearUserProfile()
        clearCreditBalance()
        clearCreditSummary()
        clearPrompts()
        clearReports()

        // Clear image cache directory
        if fileManager.fileExists(atPath: cacheDirectory.path) {
            try? fileManager.removeItem(at: cacheDirectory)
            setupCacheDirectory()
        }

        userDefaults.removeObject(forKey: CacheKey.lastSyncDate.rawValue)
    }

    // MARK: - Cache Statistics

    func getCacheSize() -> Int64 {
        var totalSize: Int64 = 0

        // Calculate UserDefaults size (approximate)
        let keys = [
            CacheKey.userProfile,
            CacheKey.creditBalance,
            CacheKey.creditSummary,
            CacheKey.prompts,
            CacheKey.reports
        ]

        for key in keys {
            if let data = userDefaults.data(forKey: key.rawValue) {
                totalSize += Int64(data.count)
            }
        }

        // Calculate file cache size
        if let enumerator = fileManager.enumerator(at: cacheDirectory, includingPropertiesForKeys: [.fileSizeKey]) {
            for case let fileURL as URL in enumerator {
                if let resourceValues = try? fileURL.resourceValues(forKeys: [.fileSizeKey]),
                   let fileSize = resourceValues.fileSize {
                    totalSize += Int64(fileSize)
                }
            }
        }

        return totalSize
    }

    func getCacheSizeFormatted() -> String {
        let size = getCacheSize()
        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useKB, .useMB]
        formatter.countStyle = .file
        return formatter.string(fromByteCount: size)
    }
}

// MARK: - ShootReportPayload Definition

/// Temporary definition - should match backend schema
struct ShootReportPayload: Codable {
    let id: String?
    let userId: String
    let shootName: String?
    let heroImages: [String]
    let summary: String?
    let totalImages: Int
    let processedAt: String?
    let creditSpent: Double?
    let processingTimeSeconds: Int?
    let providerUsage: [String: Int]?
}
