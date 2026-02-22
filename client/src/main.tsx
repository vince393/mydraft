import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const savedTheme = localStorage.getItem("theme");
if (savedTheme === "light") {
  document.documentElement.classList.remove("dark");
} else {
  document.documentElement.classList.add("dark");
}

let startY = 0;
document.addEventListener("touchstart", (e) => {
  startY = e.touches[0].pageY;
}, { passive: true });

document.addEventListener("touchmove", (e) => {
  const dy = e.touches[0].pageY - startY;
  if (dy <= 0) return;

  let el = e.target as Element | null;
  while (el && el !== document.documentElement) {
    if (el.hasAttribute("data-pull-to-refresh")) return;
    el = el.parentElement;
  }

  const target = e.target as Element;
  el = target;
  while (el && el !== document.documentElement) {
    const style = window.getComputedStyle(el);
    const oy = style.overflowY;
    if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight) {
      if (el.scrollTop > 0) return;
    }
    el = el.parentElement;
  }

  e.preventDefault();
}, { passive: false });

createRoot(document.getElementById("root")!).render(<App />);
