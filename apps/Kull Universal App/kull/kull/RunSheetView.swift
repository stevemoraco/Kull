import SwiftUI

struct RunSheetView: View {
    @Binding var selectedFolder: URL?
    @State private var selectedProvider: AIProvider = .openaiGPT5Nano
    @State private var selectedMode: ProcessingMode = .fast
    @State private var preset: String = "standard"
    @State private var includeTitle = true
    @State private var includeDescription = true
    @State private var includeTags = true
    @State private var promptText = "Standard culling: 1★ reject, 2★ duplicates, 3★ usable, 4★ keeper, 5★ hero."
    @State private var providers: [ProviderInfo] = []
    @State private var estimatedCost: Double = 0.0
    @State private var estimatedImageCount: Int = 0
    @State private var imageURLs: [URL] = []
    @State private var selectedTestImage: URL? = nil
    @State private var testResult: String? = nil
    @State private var isTesting = false
    @StateObject private var runner = RunController()
    @StateObject private var cloudService = CloudAIService.shared
    @SwiftUI.Environment(\.horizontalSizeClass) private var horizontalSizeClass: UserInterfaceSizeClass?

    private var primaryBackground: Color {
        #if os(macOS)
        return Color(nsColor: .windowBackgroundColor)
        #else
        return Color(.systemBackground)
        #endif
    }

    private var groupedBackground: Color {
        #if os(macOS)
        return Color(nsColor: .controlBackgroundColor)
        #else
        return Color(.systemGroupedBackground)
        #endif
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                Text("Run Settings")
                    .font(.largeTitle)
                    .bold()
                    .padding(.horizontal)

                // Image Thumbnails Section
                if !imageURLs.isEmpty {
                    imageThumbnailsSection
                        .padding(.horizontal)
                }

                // Processing Mode Section
                processingModeSection
                    .padding(.horizontal)

                // AI Provider Section
                providerSection
                    .padding(.horizontal)

                // Preset & Options Section
                presetSection
                    .padding(.horizontal)

                // Cost Estimate
                if selectedMode != .local && estimatedImageCount > 0 {
                    costEstimateCard
                        .padding(.horizontal)
                }

                // Prompt Editor
                promptEditorSection
                    .padding(.horizontal)

                // Test Single Image Section
                if !imageURLs.isEmpty && selectedMode != .local {
                    testSingleImageSection
                        .padding(.horizontal)
                }

                // Progress and Action
                actionSection
                    .padding(.horizontal)
            }
            .padding(.vertical)
        }
        .background(groupedBackground)
        .task {
            await loadProviders()
            loadImages()
            updateCostEstimate()
        }
        .onChange(of: selectedFolder) { _, _ in
            loadImages()
            updateCostEstimate()
        }
    }

    // MARK: - Image Thumbnails Section

    private var imageThumbnailsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "photo.on.rectangle.angled")
                    .foregroundStyle(.blue)
                Text("Images to Process")
                    .font(.headline)
                Spacer()
                Text("\(imageURLs.count) images")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 8) {
                    ForEach(imageURLs.prefix(50), id: \.self) { url in
                        ThumbnailView(url: url, isSelected: selectedTestImage == url)
                            .onTapGesture {
                                selectedTestImage = url
                            }
                    }
                    if imageURLs.count > 50 {
                        VStack {
                            Text("+\(imageURLs.count - 50)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text("more")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        .frame(width: 60, height: 60)
                        .background(Color.secondary.opacity(0.1))
                        .cornerRadius(8)
                    }
                }
                .padding(.vertical, 4)
            }
            .frame(height: 80)

            if let selected = selectedTestImage {
                HStack {
                    Text("Selected: \(selected.lastPathComponent)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Button("Clear") {
                        selectedTestImage = nil
                    }
                    .font(.caption)
                }
            }
        }
        .padding()
        .background(primaryBackground)
        .cornerRadius(12)
    }

    // MARK: - Processing Mode Section

    private var processingModeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "cpu")
                    .foregroundStyle(.blue)
                Text("Processing Mode")
                    .font(.headline)
            }

            VStack(alignment: .leading, spacing: 8) {
                ForEach(ProcessingMode.allCases) { mode in
                    Button(action: { selectedMode = mode }) {
                        HStack {
                            Image(systemName: selectedMode == mode ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(selectedMode == mode ? .blue : .secondary)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(mode.displayName)
                                    .font(.body)
                                    .foregroundStyle(.primary)
                                Text(mode.description)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                        }
                        .padding(.vertical, 8)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding()
        .background(primaryBackground)
        .cornerRadius(12)
    }

    // MARK: - Provider Section

    private var providerSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "brain")
                    .foregroundStyle(.blue)
                Text("AI Provider")
                    .font(.headline)
            }

            if selectedMode == .local {
                HStack {
                    Image(systemName: "apple.logo")
                    Text("Apple Intelligence (On-Device)")
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 8)
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    let availableProviders = providers.isEmpty
                        ? AIProvider.allCases.filter { $0 != .appleIntelligence }
                        : []

                    if providers.isEmpty {
                        ForEach(availableProviders) { provider in
                            Button(action: { selectedProvider = provider }) {
                                HStack {
                                    Image(systemName: selectedProvider == provider ? "checkmark.circle.fill" : "circle")
                                        .foregroundStyle(selectedProvider == provider ? .blue : .secondary)
                                    Text(provider.displayName)
                                        .foregroundStyle(.primary)
                                    Spacer()
                                }
                                .padding(.vertical, 6)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        }
                    } else {
                        ForEach(providers) { provider in
                            let aiProvider = AIProvider(rawValue: provider.id) ?? .openaiGPT5Nano
                            Button(action: { selectedProvider = aiProvider }) {
                                HStack {
                                    Image(systemName: selectedProvider == aiProvider ? "checkmark.circle.fill" : "circle")
                                        .foregroundStyle(selectedProvider == aiProvider ? .blue : .secondary)
                                    VStack(alignment: .leading) {
                                        Text(provider.name)
                                            .foregroundStyle(.primary)
                                        Text(provider.displayCost + " per image")
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    if provider.supportsBatch {
                                        Text("Batch OK")
                                            .font(.caption2)
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(Color.green.opacity(0.2))
                                            .foregroundStyle(.green)
                                            .cornerRadius(4)
                                    }
                                }
                                .padding(.vertical, 6)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
        .padding()
        .background(primaryBackground)
        .cornerRadius(12)
        .onChange(of: selectedMode) { _, newMode in
            if newMode == .local {
                selectedProvider = .appleIntelligence
            } else if selectedProvider == .appleIntelligence {
                selectedProvider = .openaiGPT5Nano
            }
            updateCostEstimate()
        }
        .onChange(of: selectedProvider) { _, _ in
            updateCostEstimate()
        }
    }

    // MARK: - Preset Section

    private var presetSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "slider.horizontal.3")
                    .foregroundStyle(.blue)
                Text("Preset & Options")
                    .font(.headline)
            }

            Picker("Preset", selection: $preset) {
                Text("Standard").tag("standard")
                Text("Wedding Storytelling").tag("wedding-storytelling")
                Text("Corporate Event").tag("corporate-event")
            }
            .pickerStyle(.segmented)

            Divider()

            VStack(alignment: .leading, spacing: 8) {
                Toggle("Include Title", isOn: $includeTitle)
                Toggle("Include Description", isOn: $includeDescription)
                Toggle("Include Tags", isOn: $includeTags)
            }
        }
        .padding()
        .background(primaryBackground)
        .cornerRadius(12)
    }

    // MARK: - Cost Estimate Card

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
        .background(primaryBackground)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    // MARK: - Prompt Editor Section

    private var promptEditorSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "text.bubble")
                    .foregroundStyle(.blue)
                Text("Custom Prompt")
                    .font(.headline)
                Spacer()
                #if os(macOS)
                Button("🎙 Transcribe…") {
                    TranscriptionHelper().transcribe(currentText: { self.promptText }) { self.promptText = $0 }
                }
                #endif
            }

            Text("Customize how the AI evaluates your photos. The default prompt works well for most shoots.")
                .font(.caption)
                .foregroundStyle(.secondary)

            TextEditor(text: $promptText)
                .font(.system(.body, design: .monospaced))
                .frame(minHeight: 100, maxHeight: 200)
                .padding(8)
                .background(groupedBackground)
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
                )
        }
        .padding()
        .background(primaryBackground)
        .cornerRadius(12)
    }

    // MARK: - Test Single Image Section

    private var testSingleImageSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "flask")
                    .foregroundStyle(.orange)
                Text("Test Single Image")
                    .font(.headline)
                Spacer()
            }

            Text("Test your prompt on a single image before running the full batch.")
                .font(.caption)
                .foregroundStyle(.secondary)

            HStack {
                if let selected = selectedTestImage {
                    Text(selected.lastPathComponent)
                        .font(.caption)
                        .lineLimit(1)
                        .truncationMode(.middle)
                } else {
                    Text("Tap an image above to select")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button(action: { Task { await testSingleImage() } }) {
                    HStack {
                        if isTesting {
                            ProgressView()
                                .scaleEffect(0.8)
                        } else {
                            Image(systemName: "play.circle")
                        }
                        Text("Test")
                    }
                }
                .disabled(selectedTestImage == nil || isTesting)
            }

            if let result = testResult {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Result:")
                        .font(.caption)
                        .fontWeight(.semibold)
                    Text(result)
                        .font(.system(.caption, design: .monospaced))
                        .padding(8)
                        .background(groupedBackground)
                        .cornerRadius(6)
                }
            }
        }
        .padding()
        .background(primaryBackground)
        .cornerRadius(12)
    }

    // MARK: - Action Section

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
                .background(primaryBackground)
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
                    Text("Run All \(estimatedImageCount) Images")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 56)
                .background(selectedFolder == nil || runner.isRunning ? Color.gray : Color.blue)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(selectedFolder == nil || runner.isRunning)
        }
    }

    // MARK: - Helper Methods

    private func loadProviders() async {
        do {
            providers = try await cloudService.getAvailableProviders()
        } catch {
            print("Failed to load providers: \(error)")
        }
    }

    private func loadImages() {
        guard let folder = selectedFolder else {
            imageURLs = []
            return
        }

        let validExtensions = ["cr3", "nef", "arw", "orf", "raf", "dng", "jpg", "jpeg", "png", "heic"]
        var urls: [URL] = []

        #if os(macOS)
        let fm = FileManager.default
        guard let enumerator = fm.enumerator(at: folder, includingPropertiesForKeys: [.contentModificationDateKey]) else {
            imageURLs = []
            return
        }

        while let url = enumerator.nextObject() as? URL {
            if validExtensions.contains(url.pathExtension.lowercased()) {
                urls.append(url)
            }
        }
        #else
        do {
            let files = try FileManager.default.contentsOfDirectory(
                at: folder,
                includingPropertiesForKeys: nil,
                options: [.skipsHiddenFiles]
            )
            urls = files.filter { validExtensions.contains($0.pathExtension.lowercased()) }
        } catch {
            imageURLs = []
            return
        }
        #endif

        // Sort by name
        urls.sort { $0.lastPathComponent < $1.lastPathComponent }
        imageURLs = urls
        estimatedImageCount = urls.count
    }

    private func updateCostEstimate() {
        estimatedImageCount = imageURLs.count

        if selectedMode == .local {
            estimatedCost = 0.0
        } else if let provider = providers.first(where: { $0.id == selectedProvider.rawValue }) {
            let baseCost = provider.costPerImage * Double(estimatedImageCount)
            estimatedCost = selectedMode == .economy ? baseCost * 0.5 : baseCost
        } else {
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
            let baseCost = baseCostPerImage * Double(estimatedImageCount)
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

    private func testSingleImage() async {
        guard let imageURL = selectedTestImage else { return }

        isTesting = true
        testResult = nil

        do {
            // Load image data from URL
            let imageData = try Data(contentsOf: imageURL)
            let imageFormat = imageURL.pathExtension.lowercased()

            let flags: [String] = [
                includeTitle ? "title" : nil,
                includeDescription ? "description" : nil,
                includeTags ? "tags" : nil
            ].compactMap { $0 }

            let fullPrompt = "\(promptText)\nInclude: \(flags.joined(separator: ", "))"

            let result = try await cloudService.processSingleImage(
                provider: selectedProvider,
                imageData: imageData,
                imageFormat: imageFormat,
                prompt: fullPrompt
            )

            testResult = """
            ⭐ Star Rating: \(result.result.starRating)
            🏷️ Color: \(result.result.colorLabel)
            📋 Decision: \(result.result.keepReject)
            💰 Cost: \(formatCost(result.cost))
            """
        } catch {
            testResult = "Error: \(error.localizedDescription)"
        }

        isTesting = false
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

// MARK: - Thumbnail View

struct ThumbnailView: View {
    let url: URL
    let isSelected: Bool

    #if os(macOS)
    @State private var image: NSImage? = nil
    #else
    @State private var image: UIImage? = nil
    #endif

    var body: some View {
        ZStack {
            if let image = image {
                #if os(macOS)
                Image(nsImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 60, height: 60)
                    .clipped()
                    .cornerRadius(8)
                #else
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 60, height: 60)
                    .clipped()
                    .cornerRadius(8)
                #endif
            } else {
                Rectangle()
                    .fill(Color.secondary.opacity(0.2))
                    .frame(width: 60, height: 60)
                    .cornerRadius(8)
                    .overlay(
                        Image(systemName: "photo")
                            .foregroundStyle(.secondary)
                    )
            }

            if isSelected {
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.blue, lineWidth: 3)
                    .frame(width: 60, height: 60)
            }
        }
        .task {
            await loadThumbnail()
        }
    }

    private func loadThumbnail() async {
        #if os(macOS)
        if let nsImage = NSImage(contentsOf: url) {
            // Create a smaller thumbnail
            let targetSize = CGSize(width: 120, height: 120)
            let scaledImage = NSImage(size: targetSize)
            scaledImage.lockFocus()
            nsImage.draw(in: NSRect(origin: .zero, size: targetSize),
                        from: NSRect(origin: .zero, size: nsImage.size),
                        operation: .copy,
                        fraction: 1.0)
            scaledImage.unlockFocus()
            await MainActor.run {
                self.image = scaledImage
            }
        }
        #else
        if let data = try? Data(contentsOf: url),
           let uiImage = UIImage(data: data) {
            // Create thumbnail
            let targetSize = CGSize(width: 120, height: 120)
            let renderer = UIGraphicsImageRenderer(size: targetSize)
            let thumbnail = renderer.image { _ in
                uiImage.draw(in: CGRect(origin: .zero, size: targetSize))
            }
            await MainActor.run {
                self.image = thumbnail
            }
        }
        #endif
    }
}
