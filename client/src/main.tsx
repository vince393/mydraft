import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Apply theme before React renders to prevent flash
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
