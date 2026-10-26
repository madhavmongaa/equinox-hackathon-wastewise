import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "@/App"
import "@/index.css"
import { setUpPwa } from "@/lib/pwa"

setUpPwa()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
