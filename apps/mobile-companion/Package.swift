// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "KullMobile",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .executable(
            name: "KullMobileApp",
            targets: ["KullMobile"]
        )
    ],
    targets: [
        .executableTarget(
            name: "KullMobile"
        ),
        .testTarget(
            name: "KullMobileTests",
            dependencies: ["KullMobile"]
        )
    ]
)
