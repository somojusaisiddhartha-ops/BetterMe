"use client";

import { useEffect, useRef } from "react";

type RevealOnViewProps = {
  children: React.ReactNode;
  className?: string;
  once?: boolean;
  threshold?: number;
  rootMargin?: string;
};

export default function RevealOnView({
  children,
  className,
  once = true,
  threshold = 0.2,
  rootMargin = "0px 0px -10% 0px",
}: RevealOnViewProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      root.dataset.visible = "true";
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          root.dataset.visible = "true";
          if (once) {
            observer.disconnect();
          }
          return;
        }

        if (!once) {
          root.dataset.visible = "false";
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(root);

    return () => {
      observer.disconnect();
    };
  }, [once, rootMargin, threshold]);

  return (
    <div ref={rootRef} className={className} data-visible="false">
      {children}
    </div>
  );
}
