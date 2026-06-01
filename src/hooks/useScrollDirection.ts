"use client"
import { useState, useEffect, useRef } from "react";

export function useScrollDirection(threshold = 50) {
  const [show, setShow] = useState(true);
  const lastScrollY = useRef(0);
  const accumulated = useRef(0);

  useEffect(() => {
    function onScroll() {
      const currentY = window.scrollY;
      const diff = currentY - lastScrollY.current;
      accumulated.current += diff;

      // Always show at top
      if (currentY < 60) {
        setShow(true);
        accumulated.current = 0;
        lastScrollY.current = currentY;
        return;
      }

      if (accumulated.current > threshold) {
        // Scrolled down enough — hide
        setShow(false);
        accumulated.current = 0;
      } else if (accumulated.current < -threshold) {
        // Scrolled up enough — show
        setShow(true);
        accumulated.current = 0;
      }

      lastScrollY.current = currentY;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return show;
}
