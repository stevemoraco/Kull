// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "KullMenubar",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(
            name: "KullMenubarApp",
            targets: ["KullMenubar"]
        )
    ],
    targets: [
        .executableTarget(
            name: "KullMenubar"
        ),
        .testTarget(
            name: "KullMenubarTests",
            dependencies: ["KullMenubar"]
        )
    ]
)
