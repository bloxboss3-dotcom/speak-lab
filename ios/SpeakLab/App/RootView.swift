import SwiftData
import SwiftUI

struct RootView: View {

    @State private var selection: Tab = .train

    enum Tab: Hashable {
        case train
        case paths
        case progress
        case settings
    }

    var body: some View {
        TabView(selection: $selection) {
            TodayView()
                .tabItem { Label("Train", systemImage: "mic.circle") }
                .tag(Tab.train)

            PathsView()
                .tabItem { Label("Paths", systemImage: "point.3.filled.connected.trianglepath.dotted") }
                .tag(Tab.paths)

            ProgressDashboardView()
                .tabItem { Label("Progress", systemImage: "chart.xyaxis.line") }
                .tag(Tab.progress)

            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape") }
                .tag(Tab.settings)
        }
    }
}
