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
import type { TourRect } from "./tourLayout";
import { tourChecks, tourDock, tourTargetSelectors } from "./tourGuidance";
import type { TourProgress } from "./tourTypes";
import { loadTourExample, type TourExample } from "./tourExample";
import {
  newTourPractice,
  tourRequirementMet,
  updateTourPractice,
} from "./tourPractice";
import { useCrossLabDraft } from "@/stores/cross-lab-draft";
import { useBreedDesignerDraft } from "@/stores/breed-designer-draft";
import { analysisError } from "@/lib/genefield/errors";
import { TourText } from "./TourText";
import "./guided-tour.css";

interface TourContextValue {
  progress: TourProgress;
  startTour: () => void;
  referenceLineId: string | null;
}
const TourContext = createContext<TourContextValue | null>(null);
export function useTourReferenceId() {
  return useContext(TourContext)?.referenceLineId ?? null;
}
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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [practice, setPractice] = useState(newTourPractice);
  const [example, setExample] = useState<TourExample | null>(null);
  const [exampleError, setExampleError] = useState<string | null>(null);
  const [exampleAttempt, setExampleAttempt] = useState(0);
  const crossDraft = useCrossLabDraft();
  const breedDraft = useBreedDesignerDraft();
  const [rects, setRects] = useState<TourRect[]>([]);
  const [missing, setMissing] = useState(false);
  const [otherDialog, setOtherDialog] = useState(false);
  const [dock, setDock] = useState(() => tourDock(innerWidth, innerHeight));
  const panel = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const autoAdvanceFor = useRef<string | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const routeSearch = useRef(new Map<string, string>());
  const step = index === null ? null : tourSteps[index];
  const away = !!step && step.route !== location.pathname;
  const requirementMet = tourRequirementMet(
    step?.requirement,
    practice,
    {
      ...crossDraft,
      weights: breedDraft.weights,
      dtf: breedDraft.dtf,
      filters: breedDraft.filters,
      maxCandidates: breedDraft.rules.maxCandidates,
    },
    example,
  );
  const canAdvance = requirementMet && !away;
  const checks = tourChecks(step?.id, breedDraft, example);
  const selectors = step
    ? tourTargetSelectors(step, practice, example, checks, requirementMet)
    : [];
  const selectorKey = selectors.join(",");
  const readingProfile = step?.id === "observations" && requirementMet;
  const readingCandidate = step?.id === "save" && requirementMet;
  const requestedId =
    step?.requirement === "parent-b"
      ? example?.parents[1]
      : ["search", "profile", "parent-a"].includes(step?.requirement ?? "")
        ? example?.parents[0]
        : undefined;
  const enteredId =
    step?.requirement === "search"
      ? practice.searchQuery
      : step?.requirement === "profile"
        ? practice.profileId
        : step?.requirement === "parent-a"
          ? crossDraft.parentA
          : step?.requirement === "parent-b"
            ? crossDraft.parentB
            : "";

  useEffect(() => {
    if (!sessionId) return;
    let live = true;
    setExampleError(null);
    void loadTourExample()
      .then((value) => {
        if (live) setExample(value);
      })
      .catch((error: unknown) => {
        if (live) setExampleError(analysisError(error));
      });
    return () => {
      live = false;
    };
  }, [sessionId, exampleAttempt]);

  useEffect(() => {
    tourEvents.setSession(
      sessionId && step && !away ? { id: sessionId, step: step.id } : null,
    );
    if (!step) return;
    const unsubscribe = tourEvents.subscribe((signal) => {
      if (!away && signal.type === step.event) autoAdvanceFor.current = step.id;
      setPractice((previous) =>
        updateTourPractice(
          previous,
          signal,
          away ? undefined : step.requirement,
        ),
      );
    });
    return () => {
      unsubscribe();
      tourEvents.setSession(null);
    };
  }, [step, sessionId, away]);

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
      autoAdvanceFor.current = null;
      setRects([]);
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
    setSessionId(crypto.randomUUID().slice(0, 8));
    setPractice(newTourPractice());
    setExample(null);
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
    setSessionId(null);
    setRects([]);
    restoreFocus();
  }, [restoreFocus]);

  const advance = useCallback(() => {
    if (index === null || !canAdvance) return;
    if (index === tourSteps.length - 1) {
      persist({ hasCompletedTour: true, lastTourStep: index });
      setIndex(null);
      setCompletion(true);
    } else go(index + 1);
  }, [go, index, persist, canAdvance]);

  // Events are emitted only by successful user-initiated application actions.
  useEffect(() => {
    if (step?.event && canAdvance && autoAdvanceFor.current === step.id) {
      autoAdvanceFor.current = null;
      advance();
    }
  }, [step, canAdvance, advance]);

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

  useLayoutEffect(() => {
    if (!step || minimized || otherDialog) return;
    const update = () => {
      const next = tourDock(innerWidth, innerHeight, readingCandidate);
      setDock((previous) =>
        previous.side === next.side && previous.size === next.size
          ? previous
          : next,
      );
      document.documentElement.dataset.guidedTourDock = next.side;
      document.documentElement.dataset.guidedTourStep = step.id;
      document.documentElement.style.setProperty(
        "--tour-dock-size",
        `${next.size}px`,
      );
    };
    update();
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      delete document.documentElement.dataset.guidedTourDock;
      delete document.documentElement.dataset.guidedTourStep;
      document.documentElement.style.removeProperty("--tour-dock-size");
    };
  }, [step, minimized, otherDialog, readingCandidate]);

  // Block interactions outside the highlighted task, including keyboard access.
  // A target's Select menu is portalled outside the root and remains usable.
  useEffect(() => {
    if (!step || minimized || otherDialog) return;
    const allowed = (element: Element) => {
      if (element.closest(".tour-popover, .tour-resume")) return true;
      if (document.querySelector('[data-slot="dialog-content"]')) return true;
      if (!step.requirement || away || readingProfile || readingCandidate)
        return false;
      if (step.id === "ranking" && !element.closest('[data-tour="breed-save"]'))
        return false;
      if (step.id === "save") {
        const control = element.closest('button, input, a, [role="button"]');
        if (control && !control.matches('[data-tour="candidate-open"]'))
          return false;
      }
      const targets = [...document.querySelectorAll<HTMLElement>(selectorKey)];
      if (
        targets.some((target) => target === element || target.contains(element))
      )
        return true;
      return (
        !!element.closest('[data-slot="select-content"]') &&
        targets.some(
          (target) =>
            target.matches('[role="combobox"][aria-expanded="true"]') ||
            target.querySelector('[role="combobox"][aria-expanded="true"]'),
        )
      );
    };
    const guard = (event: Event) => {
      if (event.target instanceof Element && !allowed(event.target)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    const focus = (event: FocusEvent) => {
      if (event.target instanceof Element && !allowed(event.target))
        heading.current?.focus({ preventScroll: true });
    };
    const keyboard = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" ||
        document.querySelector(
          '[data-slot="dialog-content"], [data-slot="select-content"]',
        )
      )
        return;
      if (event.key === "Tab") {
        const controls = [
          ...document.querySelectorAll<HTMLElement>(
            'button, a[href], input, select, textarea, [tabindex="0"]',
          ),
        ].filter(
          (element) =>
            allowed(element) &&
            !element.matches(':disabled, [aria-disabled="true"]') &&
            element.getClientRects().length,
        );
        const current = controls.indexOf(document.activeElement as HTMLElement);
        const next =
          controls[
            (current + (event.shiftKey ? -1 : 1) + controls.length) %
              controls.length
          ];
        event.preventDefault();
        next?.focus();
      } else guard(event);
    };
    const events = [
      "pointerdown",
      "mousedown",
      "click",
      "dblclick",
      "contextmenu",
    ];
    events.forEach((name) => document.addEventListener(name, guard, true));
    document.addEventListener("focusin", focus, true);
    document.addEventListener("keydown", keyboard, true);
    return () => {
      events.forEach((name) => document.removeEventListener(name, guard, true));
      document.removeEventListener("focusin", focus, true);
      document.removeEventListener("keydown", keyboard, true);
    };
  }, [
    step,
    minimized,
    otherDialog,
    selectorKey,
    away,
    readingProfile,
    readingCandidate,
  ]);

  // Observe route mounting and async results; give absent targets a bounded wait.
  useEffect(() => {
    if (!step || away) {
      setRects([]);
      return;
    }
    let target: HTMLElement | null = null;
    let frame = 0;
    let scrollAfterResize = false;
    const resize = new ResizeObserver(() => schedule());
    const update = () => {
      const modal = !!document.querySelector('[data-slot="dialog-content"]');
      setOtherDialog(modal);
      const targets = [...document.querySelectorAll<HTMLElement>(selectorKey)];
      const found = targets[0] ?? null;
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
      if (scrollAfterResize && target) {
        target.scrollIntoView?.({
          block: "nearest",
          inline: "nearest",
          behavior: "instant",
        });
      }
      scrollAfterResize = false;
      const nextRects = targets
        .map(visibleRect)
        .filter((value): value is TourRect => !!value);
      setRects((previous) =>
        JSON.stringify(previous) === JSON.stringify(nextRects)
          ? previous
          : nextRects,
      );
    };
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }
    const onResize = () => {
      scrollAfterResize = true;
      schedule();
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.getElementById("root") ?? document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "class",
        "style",
        "data-state",
        "data-tour",
        "data-tour-line-id",
      ],
    });
    // Dialog portals are siblings of the app root.
    const portals = new MutationObserver(schedule);
    portals.observe(document.body, { childList: true });
    const timeout = setTimeout(() => {
      if (!target || !visibleRect(target)) setMissing(true);
    }, 4000);
    window.addEventListener("resize", onResize);
    document.addEventListener("scroll", schedule, true);
    update();
    return () => {
      observer.disconnect();
      portals.disconnect();
      resize.disconnect();
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("scroll", schedule, true);
    };
  }, [step, away, selectorKey, minimized, otherDialog, dock.side, dock.size]);

  useEffect(() => {
    if (step && !otherDialog) {
      const content = panel.current?.querySelector(".tour-content");
      if (content) content.scrollTop = 0;
      heading.current?.focus({ preventScroll: true });
    }
  }, [step, otherDialog, minimized, readingProfile, readingCandidate]);

  const dismissWelcome = () => {
    persist({ hasSeenWelcome: true });
    setWelcome(false);
  };

  return (
    <TourContext.Provider
      value={{
        progress,
        startTour,
        referenceLineId:
          step?.route === "/lines" ? (example?.parents[0] ?? null) : null,
      }}
    >
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
                <svg className="tour-shade" aria-hidden>
                  <defs>
                    <mask id="tour-clear-targets">
                      <rect width="100%" height="100%" fill="white" />
                      {!away &&
                        rects.map((bounds, i) => (
                          <rect
                            key={i}
                            x={bounds.left}
                            y={bounds.top}
                            width={bounds.width}
                            height={bounds.height}
                            rx="8"
                            fill="black"
                          />
                        ))}
                    </mask>
                  </defs>
                  <rect
                    width="100%"
                    height="100%"
                    fill="rgb(9 20 15 / 0.72)"
                    mask="url(#tour-clear-targets)"
                  />
                </svg>
                {!away &&
                  rects.map((bounds, i) => (
                    <div
                      key={i}
                      className="tour-spotlight"
                      aria-hidden
                      style={bounds}
                    />
                  ))}
                <div
                  ref={panel}
                  className="tour-popover"
                  role="dialog"
                  aria-modal="false"
                  aria-labelledby="tour-heading"
                  aria-describedby="tour-body"
                  data-tour-dock={dock.side}
                  data-tour-step={step.id}
                  data-tour-phase={
                    readingProfile || readingCandidate ? "explanation" : "task"
                  }
                >
                  <div className="tour-content">
                    <div className="tour-explanation">
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
                      {!readingProfile && !readingCandidate && (
                        <p id="tour-body">{tr(step.body)}</p>
                      )}
                      {step.hint && !readingProfile && !readingCandidate && (
                        <p className="tour-hint">{tr(step.hint)}</p>
                      )}
                      {(readingProfile || readingCandidate) && (
                        <div
                          id="tour-body"
                          className="tour-reading"
                          role="status"
                        >
                          <strong>
                            <TourText
                              text={tr(
                                readingProfile
                                  ? "Read the line profile before continuing"
                                  : "Review the selected candidate",
                              )}
                            />
                          </strong>
                          <p>
                            <TourText
                              text={tr(
                                readingProfile
                                  ? "The highlighted profile belongs to {parentA}. Read its recorded traits and data availability. These are historical observations, not predicted offspring results. When you are ready, choose Next to open Pedigree Explorer."
                                  : "The highlighted detail panel shows the candidate you clicked, its parent pair, stored estimates, and review status. Read this information, then choose Next to compare your two saved candidates.",
                                { parentA: example?.parents[0] ?? "" },
                              )}
                            />
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="tour-action-area">
                      {step.task && (
                        <div className="tour-task" aria-live="polite">
                          <p className="tour-task-label">
                            {tr(
                              requirementMet ? "Task completed" : "Your task",
                            )}
                          </p>
                          <p>
                            {example || !step.task.includes("{") ? (
                              <TourText
                                text={tr(step.task, {
                                  parentA: example?.parents[0] ?? "",
                                  parentB: example?.parents[1] ?? "",
                                  poolSearch: example?.poolSearch ?? "",
                                })}
                              />
                            ) : (
                              tr(
                                "Preparing eligible example IDs from your local dataset...",
                              )
                            )}
                          </p>
                          {checks.length > 0 && (
                            <ol className="tour-checklist">
                              {checks.map((check, i) => (
                                <li
                                  key={check.selector}
                                  data-complete={check.done}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const control =
                                        document.querySelector<HTMLElement>(
                                          check.selector,
                                        );
                                      control?.scrollIntoView({
                                        block: "center",
                                        inline: "nearest",
                                        behavior: "instant",
                                      });
                                      control?.focus({ preventScroll: true });
                                    }}
                                  >
                                    <span aria-hidden>
                                      {check.done ? "✓" : i + 1}
                                    </span>
                                    <span>
                                      <TourText
                                        text={tr(check.text, {
                                          poolSearch:
                                            example?.poolSearch ?? "…",
                                        })}
                                      />
                                    </span>
                                    <span className="sr-only">
                                      {tr(
                                        check.done
                                          ? "Task completed"
                                          : "Your task",
                                      )}
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ol>
                          )}
                          {step.requirement === "save" && (
                            <p>
                              {tr("{count} of 2 different candidates saved", {
                                count: Object.keys(practice.saved).length,
                              })}
                            </p>
                          )}
                          {step.requirement === "limitations" && (
                            <label className="tour-acknowledge">
                              <input
                                type="checkbox"
                                checked={!!practice.actions.limitations}
                                onChange={(event) =>
                                  setPractice((previous) => ({
                                    ...previous,
                                    actions: {
                                      ...previous.actions,
                                      limitations: event.target.checked,
                                    },
                                  }))
                                }
                              />
                              {tr(
                                "I understand that estimates and rankings support breeder review and do not guarantee field or F1 outcomes.",
                              )}
                            </label>
                          )}
                          {!requirementMet && (
                            <p className="tour-task-wait">
                              {tr(
                                "Complete this task to unlock Next. You can still exit the tour at any time.",
                              )}
                            </p>
                          )}
                          {requestedId &&
                            enteredId?.trim() &&
                            enteredId.trim().toUpperCase() !== requestedId && (
                              <p className="tour-task-error" role="status">
                                <TourText
                                  text={tr(
                                    "This step requires {id}. Use the requested line and parent slot before continuing.",
                                    { id: requestedId },
                                  )}
                                />
                              </p>
                            )}
                        </div>
                      )}
                      {exampleError && (
                        <div className="tour-status" role="alert">
                          <p>
                            {tr("Could not prepare the practice examples.")}
                          </p>
                          <p>{tr(exampleError)}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setExampleAttempt((attempt) => attempt + 1)
                            }
                          >
                            {tr("Retry")}
                          </Button>
                        </div>
                      )}
                      {(missing || away) && (
                        <p className="tour-status" role="status">
                          {tr(
                            away
                              ? step.requirement
                                ? "Return to this step to complete the task, or exit the tour."
                                : "You opened another module. Return to this step or continue the tour."
                              : step.requirement
                                ? "This task is not available yet. Use the page's retry action or exit and restart the tour."
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
                    </div>
                  </div>
                  <div className="tour-footer">
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
                        <Button
                          size="sm"
                          onClick={advance}
                          disabled={!canAdvance}
                          aria-describedby={
                            step.task ? "tour-task-help" : undefined
                          }
                        >
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
                    {step.task && (
                      <span id="tour-task-help" className="sr-only">
                        {tr(
                          requirementMet
                            ? "Task completed"
                            : "Complete this task to unlock Next. You can still exit the tour at any time.",
                        )}
                      </span>
                    )}
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
