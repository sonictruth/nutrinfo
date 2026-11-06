import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { ErrorBox } from "../../components/ErrorBox";
import { Spinner } from "../../components/Spinner";
import {
  ProductNotFoundError,
  fetchProduct,
  formatProductForPrompt,
  summarizeProduct,
} from "../../api/openfoodfacts";
import { useSettings } from "../../settings/useSettings";
import { buildPrompt } from "../../settings/settings";
import { useAppState } from "../../state/AppState";

const FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
];

function cameraAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext === true &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

function describeCameraError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera access was denied. Allow camera access for this site in your browser settings, or type the barcode below.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No usable camera was found on this device. Type the barcode below instead.";
  }
  if (name === "NotReadableError") {
    return "The camera is already in use by another app. Close it and try again, or type the barcode below.";
  }
  return "The camera could not be started. Type the barcode below instead.";
}

type Phase =
  | { kind: "scanning" }
  | { kind: "lookup"; barcode: string }
  | { kind: "error"; message: string; barcode: string }
  | { kind: "notFound"; barcode: string };

export default function ScanPage() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { setRequest } = useAppState();

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const handledRef = useRef(false);
  const lookupAbortRef = useRef<AbortController | null>(null);

  const [phase, setPhase] = useState<Phase>({ kind: "scanning" });
  const [cameraError, setCameraError] = useState<string | null>(
    cameraAvailable()
      ? null
      : "This browser cannot use the camera here. The camera needs HTTPS (or localhost). Type the barcode below instead.",
  );
  const [manual, setManual] = useState("");

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  }, []);

  /** Stops the camera and any in-flight product lookup. */
  const stopEverything = useCallback(() => {
    stopCamera();
    lookupAbortRef.current?.abort();
    lookupAbortRef.current = null;
  }, [stopCamera]);

  const lookUp = useCallback(
    async (barcode: string) => {
      if (handledRef.current) return;
      handledRef.current = true;
      stopCamera();
      setPhase({ kind: "lookup", barcode });

      const controller = new AbortController();
      lookupAbortRef.current = controller;

      try {
        const product = await fetchProduct(barcode, controller.signal);
        // Cancelled (or unmounted) while the request was in flight: do not
        // navigate away from wherever the user went, and do not ask the model.
        if (controller.signal.aborted) return;
        const text = formatProductForPrompt(product, barcode);
        setRequest({
          prompt: buildPrompt(settings, text),
          label: barcode,
          product: summarizeProduct(product, barcode),
        });
        navigate("/result", { replace: true });
      } catch (err) {
        handledRef.current = false;
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (controller.signal.aborted) return;
        if (err instanceof ProductNotFoundError) {
          setPhase({ kind: "notFound", barcode });
          return;
        }
        setPhase({
          kind: "error",
          barcode,
          message: err instanceof Error ? err.message : "Lookup failed.",
        });
      }
    },
    [navigate, setRequest, settings, stopCamera],
  );

  // Start the camera. Cleanup stops it, which also covers StrictMode's
  // double-invoked effect in development.
  useEffect(() => {
    if (!cameraAvailable()) return;
    if (phase.kind !== "scanning") return;

    let disposed = false;
    const hints = new Map<DecodeHintType, unknown>([
      [DecodeHintType.POSSIBLE_FORMATS, FORMATS],
      [DecodeHintType.TRY_HARDER, true],
    ]);
    const reader = new BrowserMultiFormatReader(
      hints as Map<DecodeHintType, never>,
      {
        delayBetweenScanAttempts: 150,
      },
    );

    // Deferred so StrictMode's discarded first run never opens the camera; its
    // late controls.stop() would otherwise blank the shared <video> element.
    const timer = setTimeout(() => {
      reader
        .decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current ?? undefined,
          (result) => {
            if (disposed || !result) return;
            const text = result.getText().trim();
            if (text) void lookUp(text);
          },
        )
        .then((controls) => {
          if (disposed) {
            controls.stop();
            return;
          }
          controlsRef.current = controls;
        })
        .catch((err: unknown) => {
          if (disposed) return;
          setCameraError(describeCameraError(err));
        });
    }, 0);

    return () => {
      disposed = true;
      clearTimeout(timer);
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [lookUp, phase.kind]);

  // Unmount: stop the camera and abort any lookup still running.
  useEffect(() => stopEverything, [stopEverything]);

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const code = manual.replace(/\D/g, "");
    if (code.length < 8) return;
    void lookUp(code);
  }

  function retryScanning() {
    handledRef.current = false;
    setPhase({ kind: "scanning" });
  }

  return (
    <div className="page page--scan">
      <header className="app-header app-header--scan">
        <div className="app-header__slot" />
        <h1 className="app-header__title">Scan product</h1>
        <div className="app-header__slot app-header__slot--end">
          <button
            type="button"
            className="button button--ghost"
            onClick={() => {
              stopEverything();
              navigate("/", { replace: true });
            }}
          >
            Cancel
          </button>
        </div>
      </header>

      <main className="page__body page__body--scan">
        {phase.kind === "scanning" && !cameraError ? (
          <div className="scanner">
            <video
              ref={videoRef}
              className="scanner__video"
              playsInline
              muted
              autoPlay
            />
            <div className="scanner__frame" aria-hidden="true" />
            <p className="scanner__hint">
              Point the camera at the product barcode.
            </p>
          </div>
        ) : null}

        {cameraError && phase.kind === "scanning" ? (
          <ErrorBox title="Camera unavailable" message={cameraError} />
        ) : null}

        {phase.kind === "lookup" ? (
          <Spinner label={`Looking up ${phase.barcode}…`} />
        ) : null}

        {phase.kind === "notFound" ? (
          <ErrorBox
            title="Product not found"
            message={`OpenFoodFacts has no record for barcode ${phase.barcode}.`}
          >
            <button
              type="button"
              className="button button--primary"
              onClick={() =>
                navigate("/", { replace: true, state: { focusInput: true } })
              }
            >
              Type the name instead
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={retryScanning}
            >
              Scan again
            </button>
          </ErrorBox>
        ) : null}

        {phase.kind === "error" ? (
          <ErrorBox message={phase.message}>
            <button
              type="button"
              className="button button--primary"
              onClick={() => void lookUp(phase.barcode)}
            >
              Retry
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={retryScanning}
            >
              Scan again
            </button>
          </ErrorBox>
        ) : null}

        {phase.kind === "lookup" ? null : (
          <form className="manual" onSubmit={submitManual}>
            <label className="field">
              <span className="field__label">
                Or enter the barcode manually
              </span>
              <input
                className="field__input"
                name="barcode"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="3017620422003"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="button button--primary"
              disabled={manual.replace(/\D/g, "").length < 8}
            >
              Look up barcode
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
