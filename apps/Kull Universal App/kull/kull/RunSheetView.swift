import SwiftUI

struct RunSheetView: View {
    @Binding var selectedFolder: URL?
    @State private var selectedProvider: AIProvider = .appleIntelligence
    @State private var selectedMode: ProcessingMode = .local
    @State private var preset: String = "standard"
    @State private var includeTitle = true
    @State private var includeDescription = true
    @State private var includeTags = true
    @State private var promptText = "Standard culling: 1★ reject, 2★ duplicates, 3★ usable, 4★ keeper, 5★ hero."
    @State private var providers: [ProviderInfo] = []
    @State private var estimatedCost: Double = 0.0
    @State private var estimatedImageCount: Int = 0
    @StateObject private var runner = RunController()
    @StateObject private var cloudService = CloudAIService.shared
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    var body: some View {
        if horizontalSizeClass == .regular {
            // iPad: Optimized landscape layout
            iPadLayout
        } else {
            // iPhone: Compact layout
            iPhoneLayout
        }
    }

    // MARK: - iPad Layout

    private var iPadLayout: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Run Settings")
                    .font(.largeTitle)
                    .bold()
                    .padding(.horizontal)

                // Processing Mode and Provider in horizontal layout for iPad
                HStack(alignment: .top, spacing: 24) {
                    processingModeSection
                        .frame(maxWidth: .infinity)
                    providerSection
                        .frame(maxWidth: .infinity)
                    presetSection
                        .frame(maxWidth: .infinity)
                }
                .padding(.horizontal)

                // Cost estimate (more prominent on iPad)
                if selectedMode != .local && estimatedImageCount > 0 {
                    costEstimateCard
                        .padding(.horizontal)
                }

                // Prompt editor (larger on iPad)
                promptEditorSection
                    .padding(.horizontal)

                // Progress and action buttons
                actionSection
                    .padding(.horizontal)
            }
            .padding(.vertical)
        }
        .background(Color(.systemGroupedBackground))
        .task {
            await loadProviders()
            updateCostEstimate()
        }
    }

    // MARK: - iPhone Layout

    private var iPhoneLayout: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Run Settings").font(.title2).bold()

            HStack(alignment: .top, spacing: 16) {
                // Processing Mode Selection
                VStack(alignment: .leading, spacing: 8) {
                    Text("Processing Mode").font(.caption).foregroundStyle(.secondary)
                    Picker("Mode", selection: $selectedMode) {
                        ForEach(ProcessingMode.allCases) { mode in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(mode.displayName)
                                Text(mode.description).font(.caption2).foregroundStyle(.secondary)
                            }.tag(mode)
                        }
                    }
                    #if os(macOS)
                    .pickerStyle(.radioGroup)
                    #else
                    .pickerStyle(.menu)
                    #endif
                    .onChange(of: selectedMode) { _, _ in
                        updateCostEstimate()
                    }
                }

                // Provider Selection (disabled for local mode)
                VStack(alignment: .leading, spacing: 8) {
                    Text("AI Provider").font(.caption).foregroundStyle(.secondary)
                    if selectedMode == .local {
                        Text("Apple Intelligence (Local)")
                            .foregroundStyle(.secondary)
                            .padding(4)
                    } else if providers.isEmpty {
                        Picker("Provider", selection: $selectedProvider) {
                            ForEach(AIProvider.allCases.filter { $0 != .appleIntelligence }) { provider in
                                Text(provider.displayName).tag(provider)
                            }
                        }
                        #if os(macOS)
                        .pickerStyle(.radioGroup)
                        #else
                        .pickerStyle(.menu)
                        #endif
                        .disabled(selectedMode == .local)
                        .onChange(of: selectedProvider) { _, _ in
                            updateCostEstimate()
                        }
                    } else {
                        Picker("Provider", selection: $selectedProvider) {
                            ForEach(providers) { provider in
                                HStack {
                                    Text(provider.name)
                                    Spacer()
                                    Text(provider.displayCost).font(.caption).foregroundStyle(.secondary)
                                }.tag(AIProvider(rawValue: provider.id) ?? .openaiGPT5Nano)
                            }
                        }
                        #if os(macOS)
                        .pickerStyle(.radioGroup)
                        #else
                        .pickerStyle(.menu)
                        #endif
                        .disabled(selectedMode == .local)
                        .onChange(of: selectedProvider) { _, _ in
                            updateCostEstimate()
                        }
                    }
                }

                // Preset and Options
                VStack(alignment: .leading, spacing: 8) {
                    Text("Preset").font(.caption).foregroundStyle(.secondary)
                    Picker("Preset", selection: $preset) {
                        Text("Standard").tag("standard")
                        Text("Wedding Storytelling").tag("wedding-storytelling")
                        Text("Corporate Event").tag("corporate-event")
                    }.pickerStyle(.menu)

                    Toggle("Title", isOn: $includeTitle)
                    Toggle("Description", isOn: $includeDescription)
                    Toggle("Tags", isOn: $includeTags)
                }
            }

            // Cost Estimate
            if selectedMode != .local && estimatedImageCount > 0 {
                HStack {
                    Image(systemName: "dollarsign.circle")
                        .foregroundStyle(.secondary)
                    Text("Estimated cost: ")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(formatCost(estimatedCost))
                        .font(.caption)
                        .fontWeight(.semibold)
                    Text("(\(estimatedImageCount) images)")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 4)
                .padding(.horizontal, 8)
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(6)
            }

            HStack {
                Text("Custom Prompt (optional)").font(.caption).foregroundStyle(.secondary)
                Spacer()
                #if os(macOS)
                Button("🎙 Transcribe…") {
                    TranscriptionHelper().transcribe(currentText: { self.promptText }) { self.promptText = $0 }
                }
                #endif
            }
            TextEditor(text: $promptText)
                .font(.system(.body, design: .monospaced))
                .border(.quaternary)
                .frame(height: 120)

            // Progress and Run Button
            HStack {
                if runner.isRunning {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            ProgressView(value: Double(runner.processed), total: Double(max(runner.total, 1)))
                                .frame(width: 180)
                            Text("\(runner.processed)/\(runner.total)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        if runner.currentCost > 0 {
                            Text("Cost so far: \(formatCost(runner.currentCost))")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                } else if runner.processed > 0 && runner.processed == runner.total {
                    // Show completion message
                    VStack(alignment: .leading, spacing: 4) {
                        #if os(macOS)
                        Text("✓ Complete! XMP files written next to your photos.")
                            .font(.caption)
                            .foregroundStyle(.green)
                        Text("Open Lightroom to import with ratings.")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        #else
                        Text("✓ Complete! XMP files ready to save.")
                            .font(.caption)
                            .foregroundStyle(.green)
                        Text("Use the share sheet to save XMP files back to your photo library.")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        #endif
                    }
                }
                Spacer()
                Button("Run") { Task { await startRun() } }
                    .disabled(selectedFolder == nil || runner.isRunning)
            }
        }
        .padding(20)
        .task {
            await loadProviders()
            updateCostEstimate()
        }
    }

    // MARK: - Reusable Components

    private var processingModeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Processing Mode")
                .font(.headline)
            Picker("Mode", selection: $selectedMode) {
                ForEach(ProcessingMode.allCases) { mode in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(mode.displayName)
                        Text(mode.description).font(.caption2).foregroundStyle(.secondary)
                    }.tag(mode)
                }
            }
            #if os(macOS)
            .pickerStyle(.radioGroup)
            #else
            .pickerStyle(.menu)
            #endif
            .frame(minHeight: 44)  // iPad: Touch target
            .onChange(of: selectedMode) { _, _ in
                updateCostEstimate()
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    private var providerSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("AI Provider")
                .font(.headline)
            if selectedMode == .local {
                Text("Apple Intelligence (Local)")
                    .foregroundStyle(.secondary)
                    .padding(12)
                    .frame(minHeight: 44)
            } else if providers.isEmpty {
                Picker("Provider", selection: $selectedProvider) {
                    ForEach(AIProvider.allCases.filter { $0 != .appleIntelligence }) { provider in
                        Text(provider.displayName).tag(provider)
                    }
                }
                #if os(macOS)
                .pickerStyle(.radioGroup)
                #else
                .pickerStyle(.menu)
                #endif
                .disabled(selectedMode == .local)
                .frame(minHeight: 44)
                .onChange(of: selectedProvider) { _, _ in
                    updateCostEstimate()
                }
            } else {
                Picker("Provider", selection: $selectedProvider) {
                    ForEach(providers) { provider in
                        HStack {
                            Text(provider.name)
                            Spacer()
                            Text(provider.displayCost).font(.caption).foregroundStyle(.secondary)
                        }.tag(AIProvider(rawValue: provider.id) ?? .openaiGPT5Nano)
                    }
                }
                #if os(macOS)
                .pickerStyle(.radioGroup)
                #else
                .pickerStyle(.menu)
                #endif
                .disabled(selectedMode == .local)
                .frame(minHeight: 44)
                .onChange(of: selectedProvider) { _, _ in
                    updateCostEstimate()
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    private var presetSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Preset & Options")
                .font(.headline)
            Picker("Preset", selection: $preset) {
                Text("Standard").tag("standard")
                Text("Wedding Storytelling").tag("wedding-storytelling")
                Text("Corporate Event").tag("corporate-event")
            }
            .pickerStyle(.menu)
            .frame(minHeight: 44)

            Toggle("Title", isOn: $includeTitle)
                .frame(minHeight: 44)
            Toggle("Description", isOn: $includeDescription)
                .frame(minHeight: 44)
            Toggle("Tags", isOn: $includeTags)
                .frame(minHeight: 44)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    private var costEstimateCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "dollarsign.circle.fill")
                    .font(.title2)
                    .foregroundStyle(.blue)
                Text("Cost Estimate")
                    .font(.headline)
                Spacer()
                Text(formatCost(estimatedCost))
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(.blue)
            }
            HStack {
                Text("\(estimatedImageCount) images")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
                if selectedMode == .economy {
                    Text("50% savings with batch processing")
                        .font(.caption)
                        .foregroundStyle(.green)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    private var promptEditorSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Custom Prompt (optional)")
                    .font(.headline)
                Spacer()
                #if os(macOS)
                Button("🎙 Transcribe…") {
                    TranscriptionHelper().transcribe(currentText: { self.promptText }) { self.promptText = $0 }
                }
                .frame(minHeight: 44)
                #endif
            }
            TextEditor(text: $promptText)
                .font(.system(.body, design: .monospaced))
                .frame(height: horizontalSizeClass == .regular ? 180 : 120)
                .border(.quaternary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    private var actionSection: some View {
        VStack(spacing: 16) {
            if runner.isRunning {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        ProgressView(value: Double(runner.processed), total: Double(max(runner.total, 1)))
                        Text("\(runner.processed)/\(runner.total)")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    if runner.currentCost > 0 {
                        Text("Cost so far: \(formatCost(runner.currentCost))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding()
                .background(Color(.systemBackground))
                .cornerRadius(12)
            } else if runner.processed > 0 && runner.processed == runner.total {
                VStack(alignment: .leading, spacing: 8) {
                    #if os(macOS)
                    Label("Complete! XMP files written next to your photos.", systemImage: "checkmark.circle.fill")
                        .font(.headline)
                        .foregroundStyle(.green)
                    Text("Open Lightroom to import with ratings.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    #else
                    Label("Complete! XMP files ready to save.", systemImage: "checkmark.circle.fill")
                        .font(.headline)
                        .foregroundStyle(.green)
                    Text("Use the share sheet to save XMP files back to your photo library.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    #endif
                }
                .padding()
                .background(Color.green.opacity(0.1))
                .cornerRadius(12)
            }

            Button(action: { Task { await startRun() } }) {
                HStack {
                    Image(systemName: "play.fill")
                    Text("Run")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 56)  // iPad: Larger button
                .background(selectedFolder == nil || runner.isRunning ? Color.gray : Color.blue)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(selectedFolder == nil || runner.isRunning)
        }
    }

    private func loadProviders() async {
        do {
            providers = try await cloudService.getAvailableProviders()
        } catch {
            print("Failed to load providers: \(error)")
        }
    }

    private func updateCostEstimate() {
        guard let folder = selectedFolder else {
            estimatedImageCount = 0
            estimatedCost = 0.0
            return
        }

        // Count images in folder
        let validExtensions = ["cr3", "nef", "arw", "orf", "raf", "dng", "jpg", "jpeg", "png", "heic"]
        var count = 0

        #if os(macOS)
        // macOS: Use enumerator for recursive folder traversal
        let fm = FileManager.default
        guard let enumerator = fm.enumerator(at: folder, includingPropertiesForKeys: nil) else {
            estimatedImageCount = 0
            estimatedCost = 0.0
            return
        }

        while let url = enumerator.nextObject() as? URL {
            if validExtensions.contains(url.pathExtension.lowercased()) {
                count += 1
            }
        }
        #else
        // iOS: Use contentsOfDirectory (user selected folder from UIDocumentPicker)
        do {
            let files = try FileManager.default.contentsOfDirectory(
                at: folder,
                includingPropertiesForKeys: nil,
                options: [.skipsHiddenFiles]
            )
            count = files.filter { validExtensions.contains($0.pathExtension.lowercased()) }.count
        } catch {
            estimatedImageCount = 0
            estimatedCost = 0.0
            return
        }
        #endif

        estimatedImageCount = count

        // Calculate cost based on mode and provider
        if selectedMode == .local {
            estimatedCost = 0.0
        } else if let provider = providers.first(where: { $0.id == selectedProvider.rawValue }) {
            let baseCost = provider.costPerImage * Double(count)
            // Economy mode is 50% cheaper
            estimatedCost = selectedMode == .economy ? baseCost * 0.5 : baseCost
        } else {
            // Fallback estimate if providers not loaded
            let baseCostPerImage: Double
            switch selectedProvider {
            case .googleFlashLite:
                baseCostPerImage = 0.0003
            case .openaiGPT5Nano:
                baseCostPerImage = 0.0004
            case .anthropicHaiku:
                baseCostPerImage = 0.004
            case .grokMini:
                baseCostPerImage = 0.0005
            case .kimiK2:
                baseCostPerImage = 0.0005
            case .appleIntelligence:
                baseCostPerImage = 0.0
            }
            let baseCost = baseCostPerImage * Double(count)
            estimatedCost = selectedMode == .economy ? baseCost * 0.5 : baseCost
        }
    }

    private func formatCost(_ cost: Double) -> String {
        if cost == 0.0 {
            return "FREE"
        } else if cost < 0.01 {
            return String(format: "$%.4f", cost)
        } else {
            return String(format: "$%.2f", cost)
        }
    }

    private func startRun() async {
        guard let folder = selectedFolder else { return }

        let flags: [String] = [
            includeTitle ? "title" : nil,
            includeDescription ? "description" : nil,
            includeTags ? "tags" : nil
        ].compactMap { $0 }

        let fullPrompt = "\(promptText)\nInclude: \(flags.joined(separator: ", "))"

        do {
            try await runner.runCulling(
                folderURL: folder,
                provider: selectedMode == .local ? .appleIntelligence : selectedProvider,
                mode: selectedMode,
                prompt: fullPrompt
            )
        } catch {
            print("Run failed: \(error)")
        }
    }
}
