import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { drawText, splitText } from "canvas-txt";
import { renderImage } from "../services/render.ts";
import { printImage } from "../services/printer.ts";

const WIDTH = 384;
const FONT_FAMILY = `"IBM VGA 9x16", "Courier New", Courier, monospace`;
const FONT_SIZE = 16;
const LINE_HEIGHT_RATIO = 1.15;

type Mode = "image" | "text";

export default function PurrintApp() {
  const previewCanvas = useRef<HTMLCanvasElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const textArea = useRef<HTMLTextAreaElement>(null);

  const [photoImageData, setPhotoImageData] = useState<ImageData>();
  const [isBluetoothAvailable] = useState("bluetooth" in navigator);
  const [mode, setMode] = useState<Mode>("image");
  const [textInput, setTextInput] = useState("");

  function handleFile(file: File) {
    if (!previewCanvas.current) {
      return;
    }
    renderImage(file, previewCanvas.current)
      .then((imageData) => {
        setPhotoImageData(imageData);
      })
      .catch((error) => {
        console.error("Rendering failed:", error);
        alert("Rendering failed. See console for details.");
      });
  }

  function onImageInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) {
      handleFile(event.target.files[0]);
    }
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (event.dataTransfer?.files.length) {
      handleFile(event.dataTransfer.files[0]);
    }
  }

  useLayoutEffect(() => {
    if (mode !== "text" || !textArea.current) {
      return;
    }
    const textareaElement = textArea.current;
    textareaElement.style.height = "auto";
    const measuredHeight = textareaElement.scrollHeight;
    textareaElement.style.height = `${measuredHeight}px`;
  }, [mode, textInput]);

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      for (const item of Array.from(event.clipboardData?.items ?? [])) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            handleFile(file);
            return;
          }
        }
      }
    }
    addEventListener("paste", onPaste);
    return () => removeEventListener("paste", onPaste);
  }, []);

  useEffect(() => {
    if (mode !== "image" || !photoImageData || !previewCanvas.current) return;
    const canvas = previewCanvas.current;
    canvas.width = photoImageData.width;
    canvas.height = photoImageData.height;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(photoImageData, 0, 0);
  }, [mode, photoImageData]);

  async function onPrintClick() {
    if (mode === "text") {
      if (!textInput.trim()) {
        alert("Please enter some text first.");
        return;
      }

      try {
        const imageData = renderTextToCanvas(
          textInput,
          previewCanvas.current!
        );
        await printImage(imageData);
      } catch (error) {
        console.error("Printing failed:", error);
        alert("Printing failed. See console for details.");
      }
      return;
    }

    if (!photoImageData) {
      alert("Please select an image first.");
      return;
    }

    try {
      await printImage(photoImageData);
    } catch (error) {
      console.error("Printing failed:", error);
      alert("Printing failed. See console for details.");
    }
  }


  const modeToggleButtonBase =
    "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500";
  const modeToggleButtonActive = "bg-white text-zinc-900 shadow-sm";
  const modeToggleButtonInactive = "text-zinc-500 hover:text-zinc-900";

  return (
    <div className="flex w-full max-w-xl flex-col gap-8 rounded-3xl border border-zinc-100 bg-white p-8 shadow-sm">
      <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">
        PURRINT
      </h1>

      {!isBluetoothAvailable && (
        <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-800">
          PURRINT works only on Android and desktop Chrome-based browsers.
        </div>
      )}

      <div className="flex rounded-lg bg-zinc-100 p-1">
        <button
          type="button"
          className={`${modeToggleButtonBase} ${
            mode === "image" ? modeToggleButtonActive : modeToggleButtonInactive
          }`}
          onClick={() => setMode("image")}
        >
          Image
        </button>
        <button
          type="button"
          className={`${modeToggleButtonBase} ${
            mode === "text" ? modeToggleButtonActive : modeToggleButtonInactive
          }`}
          onClick={() => setMode("text")}
        >
          Text
        </button>
      </div>

      <div className="flex justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <div
          id="preview-container"
          style={{ fontFamily: FONT_FAMILY }}
          className={[
            "flex w-[384px] min-h-[180px] bg-white shadow-sm ring-1 ring-black/5",
            mode === "image"
              ? "cursor-pointer items-center justify-center"
              : "cursor-text items-stretch justify-start",
          ].join(" ")}
          onClick={
            mode === "image" ? () => imageInput.current?.click() : undefined
          }
          onDrop={mode === "image" ? onDrop : undefined}
          onDragOver={
            mode === "image"
              ? (event) => {
                  event.preventDefault();
                }
              : undefined
          }
        >
          {mode === "image" && !photoImageData && (
            <div
              id="preview-text"
              className="pointer-events-none w-full p-4 text-center text-zinc-400"
            >
              <span className="font-sans text-sm font-medium">
                Click to select image
              </span>
              <br />
              <span className="font-sans text-xs text-zinc-300">
                (or paste / drop here)
              </span>
            </div>
          )}

          {mode === "text" && (
            <textarea
              ref={textArea}
              className="min-h-[180px] w-full resize-none bg-transparent p-0 outline-none placeholder:text-zinc-300"
              placeholder="Type your message here…"
              value={textInput}
              onChange={(event) => setTextInput(event.target.value)}
              style={{ fontFamily: FONT_FAMILY, fontSize: FONT_SIZE }}
            />
          )}

          <canvas
            id="preview"
            ref={previewCanvas}
            className={[
              "h-auto w-full pointer-events-none pixelated",
              photoImageData ? "block" : "hidden",
            ]
              .filter(Boolean)
              .join(" ")}
          ></canvas>
        </div>
      </div>

      <input
        type="file"
        id="image-input"
        accept="image/*"
        className="hidden"
        ref={imageInput}
        onChange={onImageInputChange}
      />
      <button
        id="print-button"
        type="button"
        className="w-full rounded-xl bg-zinc-900 px-6 py-4 text-lg font-bold text-white shadow-lg transition-all hover:bg-zinc-800 hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none"
        onClick={onPrintClick}
        disabled={!isBluetoothAvailable}
      >
        PURRINT!
      </button>
    </div>
  );
}

function renderTextToCanvas(
  text: string,
  canvas: HTMLCanvasElement
): ImageData {
  const ctx = canvas.getContext("2d")!;
  ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
  const lines = splitText({ ctx, text, justify: false, width: WIDTH });
  canvas.width = WIDTH;
  const lineHeightPx = FONT_SIZE * LINE_HEIGHT_RATIO;
  canvas.height = Math.max(lines.length, 1) * lineHeightPx;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000";
  drawText(ctx, text, {
    x: 0,
    y: 0,
    width: canvas.width,
    fontSize: FONT_SIZE,
    height: canvas.height,
    font: FONT_FAMILY,
    lineHeight: lineHeightPx,
    align: "left",
    vAlign: "top",
  });
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
