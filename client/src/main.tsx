import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Apply theme before React renders to prevent flash
const savedTheme = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

if (savedTheme === "light") {
  document.documentElement.classList.remove("dark");
} else if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
} else {
  // system or no preference - follow system
  if (systemPrefersDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

createRoot(document.getElementById("root")!).render(<App />);
