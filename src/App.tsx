import { LuluChat } from "@/chat/LuluChat"
import { BottomNav, JoinSheet, LevelUpCard, LuluFab, Toasts, TopNav } from "@/components/app-chrome"
import { AccountScreen } from "@/screens/AccountScreen"
import { CleaningScreen } from "@/screens/CleaningScreen"
import { DumpsScreen } from "@/screens/DumpsScreen"
import { GuideScreen } from "@/screens/GuideScreen"
import { KabadiwalaScreen } from "@/screens/KabadiwalaScreen"
import { HistoryDetailScreen, HistoryScreen } from "@/screens/HistoryScreen"
import { HomeScreen } from "@/screens/HomeScreen"
import { ImpactScreen } from "@/screens/ImpactScreen"
import { LeaderboardScreen } from "@/screens/LeaderboardScreen"
import { ProfileScreen } from "@/screens/ProfileScreen"
import { ScanScreen } from "@/screens/ScanScreen"
import { AppProvider, useApp } from "@/state/AppContext"
import { CaptureProvider } from "@/state/capture"

function CurrentScreen() {
  const { screen } = useApp()
  switch (screen.name) {
    case "home":
      return <HomeScreen />
    case "scan":
      return <ScanScreen key={screen.start?.key ?? "scan"} start={screen.start} />
    case "leaderboard":
      return <LeaderboardScreen />
    case "history":
      return <HistoryScreen />
    case "historyDetail":
      return <HistoryDetailScreen id={screen.id} />
    case "profile":
      return <ProfileScreen />
    case "guide":
      return <GuideScreen />
    case "dumps":
      return <DumpsScreen key={screen.dumpId ?? "dumps"} dumpId={screen.dumpId} />
    case "cleaning":
      return <CleaningScreen />
    case "impact":
      return <ImpactScreen />
    case "account":
      return <AccountScreen key={screen.mode ?? "account"} mode={screen.mode} />
    case "kabadiwala":
      return <KabadiwalaScreen key={`${screen.from ?? ""}:${screen.kinds?.join() ?? ""}`} kinds={screen.kinds} from={screen.from} />
  }
}

export default function App() {
  return (
    <AppProvider>
      <CaptureProvider>
        <TopNav />
        {/* phones: 480px column · tablets: 720px · laptops: full 1200px layout */}
        <div className="relative mx-auto min-h-dvh w-full max-w-[480px] md:max-w-[720px] lg:max-w-[1200px] lg:px-4">
          <main>
            <CurrentScreen />
          </main>
        </div>
        <LuluFab />
        <BottomNav />
        <Toasts />
        <LuluChat />
        <JoinSheet />
        <LevelUpCard />
      </CaptureProvider>
    </AppProvider>
  )
}
