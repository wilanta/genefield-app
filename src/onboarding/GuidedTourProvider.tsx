import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, ChevronLeft, ChevronRight, Sprout, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/components/language-provider";
import { tourSteps } from "./tourSteps";
import { readTourProgress, writeTourProgress } from "./tourStorage";
import { tourEvents } from "./tourEvents";
import { placeTourPopover, type TourRect } from "./tourLayout";
import type { TourProgress } from "./tourTypes";
import "./guided-tour.css";

interface TourContextValue {
  progress: TourProgress;
  startTour: () => void;
}
const TourContext = createContext<TourContextValue | null>(null);
export function useGuidedTour() {
  const value = useContext(TourContext);
  if (!value) throw new Error("useGuidedTour requires GuidedTourProvider");
  return value;
}

function visibleRect(element: HTMLElement): TourRect | null {
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  let left = Math.max(8, rect.left - 5);
  let top = Math.max(8, rect.top - 5);
  let right = Math.min(innerWidth - 8, rect.right + 5);
  let bottom = Math.min(innerHeight - 8, rect.bottom + 5);
  for (
    let parent = element.parentElement;
    parent;
    parent = parent.parentElement
  ) {
    const style = getComputedStyle(parent);
    const bounds = parent.getBoundingClientRect();
    if (/auto|scroll|hidden|clip/.test(style.overflowX)) {
      left = Math.max(left, bounds.left);
      right = Math.min(right, bounds.right);
    }
    if (/auto|scroll|hidden|clip/.test(style.overflowY)) {
      top = Math.max(top, bounds.top);
      bottom = Math.min(bottom, bounds.bottom);
    }
  }
  return right > left && bottom > top
    ? { left, top, width: right - left, height: bottom - top }
    : null;
}

export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const { t: tr } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [progress, setProgress] = useState(readTourProgress);
  const [welcome, setWelcome] = useState(
    () => !readTourProgress().hasSeenWelcome,
  );
  const [index, setIndex] = useState<number | null>(null);
  const [completion, setCompletion] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [rect, setRect] = useState<TourRect | null>(null);
  const [missing, setMissing] = useState(false);
  const [otherDialog, setOtherDialog] = useState(false);
  const [position, setPosition] = useState({ left: 16, top: 16 });
  const panel = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const routeSearch = useRef(new Map<string, string>());
  const step = index === null ? null : tourSteps[index];
  const away = !!step && step.route !== location.pathname;

  const persist = useCallback((patch: Partial<TourProgress>) => {
    setProgress((previous) => {
      const next = { ...previous, ...patch };
      writeTourProgress(next);
      return next;
    });
  }, []);

  useEffect(() => {
    routeSearch.current.set(location.pathname, location.search);
  }, [location.pathname, location.search]);

  const go = useCallback(
    (nextIndex: number) => {
      const next = tourSteps[nextIndex];
      setRect(null);
      setMissing(false);
      setIndex(nextIndex);
      setMinimized(false);
      persist({ hasSeenWelcome: true, lastTourStep: nextIndex });
      if (location.pathname !== next.route)
        navigate(next.route + (routeSearch.current.get(next.route) ?? ""));
    },
    [location.pathname, navigate, persist],
  );

  const startTour = useCallback(() => {
    if (index !== null) return;
    returnFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setWelcome(false);
    setCompletion(false);
    go(0);
  }, [go, index]);

  const restoreFocus = useCallback(() => {
    requestAnimationFrame(() => {
      const previous = returnFocus.current;
      if (previous?.isConnected) previous.focus();
      else document.querySelector<HTMLElement>('a[href="/settings"]')?.focus();
    });
  }, []);

  const exit = useCallback(() => {
    setIndex(null);
    setRect(null);
    restoreFocus();
  }, [restoreFocus]);

  const advance = useCallback(() => {
    if (index === null) return;
    if (index === tourSteps.length - 1) {
      persist({ hasCompletedTour: true, lastTourStep: index });
      setIndex(null);
      setCompletion(true);
    } else go(index + 1);
  }, [go, index, persist]);

  // Events are emitted only by successful user-initiated application actions.
  useEffect(() => {
    if (!step?.event || away) return;
    return tourEvents.subscribe(step.event, advance);
  }, [step, away, advance]);

  useEffect(() => {
    if (!step) return;
    const escape = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        !document.querySelector('[data-slot="dialog-content"]')
      ) {
        event.preventDefault();
        exit();
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [step, exit]);

  // Observe route mounting and async results; give absent targets a bounded wait.
  useEffect(() => {
    if (!step || away) {
      setRect(null);
      return;
    }
    let target: HTMLElement | null = null;
    let frame = 0;
    const resize = new ResizeObserver(() => schedule());
    const update = () => {
      const modal = !!document.querySelector('[data-slot="dialog-content"]');
      setOtherDialog(modal);
      const found = document.querySelector<HTMLElement>(
        `[data-tour="${step.target}"]`,
      );
      if (found !== target) {
        const hadTarget = target !== null;
        resize.disconnect();
        target = found;
        if (target) {
          target.scrollIntoView?.({
            block: "nearest",
            inline: "nearest",
            behavior: "instant",
          });
          resize.observe(target);
          setMissing(false);
        } else if (hadTarget) {
          setMissing(true);
        }
      }
      const nextRect = target ? visibleRect(target) : null;
      setRect((previous) =>
        JSON.stringify(previous) === JSON.stringify(nextRect)
          ? previous
          : nextRect,
      );
    };
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }
    const observer = new MutationObserver(schedule);
    observer.observe(document.getElementById("root") ?? document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-state", "data-tour"],
    });
    // Dialog portals are siblings of the app root.
    const portals = new MutationObserver(schedule);
    portals.observe(document.body, { childList: true });
    const timeout = setTimeout(() => {
      if (!target || !visibleRect(target)) setMissing(true);
    }, 4000);
    window.addEventListener("resize", schedule);
    document.addEventListener("scroll", schedule, true);
    update();
    return () => {
      observer.disconnect();
      portals.disconnect();
      resize.disconnect();
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("scroll", schedule, true);
    };
  }, [step, away]);

  useLayoutEffect(() => {
    if (!step || !panel.current) return;
    const update = () => {
      if (!panel.current) return;
      const bounds = panel.current.getBoundingClientRect();
      setPosition(
        placeTourPopover(away ? null : rect, bounds, {
          width: innerWidth,
          height: innerHeight,
        }),
      );
    };
    const observer = new ResizeObserver(update);
    observer.observe(panel.current);
    window.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [step, rect, away, otherDialog, minimized]);

  useEffect(() => {
    if (step && !otherDialog) heading.current?.focus({ preventScroll: true });
  }, [step, otherDialog, minimized]);

  const dismissWelcome = () => {
    persist({ hasSeenWelcome: true });
    setWelcome(false);
  };

  return (
    <TourContext.Provider value={{ progress, startTour }}>
      {children}
      <Dialog
        open={welcome}
        onOpenChange={(open) => {
          if (!open) dismissWelcome();
        }}
      >
        <DialogContent
          className="tour-dialog sm:max-w-lg"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (index === null) restoreFocus();
          }}
        >
          <span className="tour-emblem">
            <Sprout aria-hidden />
          </span>
          <DialogHeader>
            <DialogTitle>{tr("Welcome to GeneField")}</DialogTitle>
            <DialogDescription>
              {tr(
                "GeneField helps you explore breeding evidence, analyze parent pairs, and turn a large candidate space into a focused shortlist for further evaluation.",
              )}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {tr(
              "This guided tour takes about 5–8 minutes and walks through the complete workflow.",
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={dismissWelcome}>
              {tr("Maybe Later")}
            </Button>
            <Button onClick={startTour}>
              <BookOpen aria-hidden />
              {tr("Start Guided Tour")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {step &&
        !otherDialog &&
        createPortal(
          <div className="tour-layer">
            {minimized ? (
              <div className="tour-resume">
                <Button autoFocus onClick={() => setMinimized(false)}>
                  <BookOpen aria-hidden />
                  {tr("Continue Guided Tour")} · {index! + 1}/{tourSteps.length}
                </Button>
                <Button
                  variant="outline"
                  onClick={exit}
                  aria-label={tr("Close guided tour")}
                >
                  <X aria-hidden />
                </Button>
              </div>
            ) : (
              <>
                <div
                  className="tour-spotlight"
                  aria-hidden
                  style={
                    rect && !away
                      ? {
                          left: rect.left,
                          top: rect.top,
                          width: rect.width,
                          height: rect.height,
                        }
                      : {
                          inset: 0,
                          borderRadius: 0,
                          background: "rgb(15 29 22 / 0.32)",
                          border: 0,
                        }
                  }
                />
                <div
                  ref={panel}
                  className="tour-popover"
                  role="dialog"
                  aria-modal="false"
                  aria-labelledby="tour-heading"
                  aria-describedby="tour-body"
                  style={position}
                  data-tour-step={step.id}
                >
                  <div className="tour-eyebrow">
                    <span>{tr(step.category)}</span>
                    <button
                      type="button"
                      onClick={exit}
                      aria-label={tr("Close guided tour")}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <p
                    className="tour-progress"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {tr("{current} of {total}", {
                      current: index! + 1,
                      total: tourSteps.length,
                    })}{" "}
                    · {tr("Guided Tour")}
                  </p>
                  <div className="tour-progress-track" aria-hidden>
                    <span
                      style={{
                        width: `${((index! + 1) / tourSteps.length) * 100}%`,
                      }}
                    />
                  </div>
                  <h2 id="tour-heading" ref={heading} tabIndex={-1}>
                    {tr(step.title)}
                  </h2>
                  <p id="tour-body">{tr(step.body)}</p>
                  {step.hint && <p className="tour-hint">{tr(step.hint)}</p>}
                  {(missing || away) && (
                    <p className="tour-status" role="status">
                      {tr(
                        away
                          ? "You opened another module. Return to this step or continue the tour."
                          : "This area is not available yet. You can continue the tour and explore it later.",
                      )}
                    </p>
                  )}
                  {away && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => go(index!)}
                    >
                      {tr("Return to step")}
                    </Button>
                  )}
                  <div className="tour-controls">
                    <Button variant="ghost" size="sm" onClick={exit}>
                      {tr("Skip Tour")}
                    </Button>
                    <div className="tour-controls-pages">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={index === 0}
                        onClick={() => go(index! - 1)}
                      >
                        <ChevronLeft aria-hidden />
                        {tr("Back")}
                      </Button>
                      <Button size="sm" onClick={advance}>
                        {tr(
                          index === tourSteps.length - 1
                            ? "Finish Tour"
                            : step.event
                              ? "Continue Tour"
                              : "Next",
                        )}
                        <ChevronRight aria-hidden />
                      </Button>
                    </div>
                  </div>
                  <p className="tour-keyboard">
                    {tr("Esc to exit · Tab to move between controls")}
                  </p>
                  <button
                    type="button"
                    className="tour-hide"
                    onClick={() => setMinimized(true)}
                  >
                    {tr("Hide tip to explore this screen")}
                  </button>
                </div>
              </>
            )}
          </div>,
          document.body,
        )}
      <Dialog open={completion} onOpenChange={setCompletion}>
        <DialogContent
          className="tour-dialog sm:max-w-lg"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (index === null) restoreFocus();
          }}
        >
          <span className="tour-emblem">
            <Sprout aria-hidden />
          </span>
          <DialogHeader>
            <DialogTitle>{tr("You're ready to explore GeneField")}</DialogTitle>
            <DialogDescription>
              {tr(
                "You now know the complete workflow: explore lines, inspect pedigree, analyze a pair, rank candidate crosses, compare a shortlist, and review the evidence behind the models.",
              )}
            </DialogDescription>
          </DialogHeader>
          <p className="tour-workflow">
            {tr("Explore → Analyze → Rank → Compare → Review")}
          </p>
          <p className="text-sm">
            {tr(
              "GeneField supports breeder decisions—it does not replace breeder judgment or field evaluation.",
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {tr("You can replay this Guided Tour anytime from Settings.")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={startTour}>
              {tr("Restart Tour")}
            </Button>
            <Button onClick={() => setCompletion(false)}>
              {tr("Start Exploring")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TourContext.Provider>
  );
}
