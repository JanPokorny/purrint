import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { drawText, splitText } from "canvas-txt";
import { Image, AlignLeft } from "lucide-react";
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
    "p-3 transition-colors focus-visible:outline-none rounded-xl border-2";
  const modeToggleButtonActive = "border-black bg-black text-white";
  const modeToggleButtonInactive = "border-transparent text-black hover:bg-zinc-100";

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4 p-4 pt-2 pb-16">
      <h1 className="font-hand text-6xl text-black pb-2">
        purrint
      </h1>

      {!isBluetoothAvailable && (
        <div className="w-full max-w-[404px] rounded-lg bg-amber-50 p-4 text-center text-sm font-medium text-amber-900/80 mb-2">
          Use Chrome on Android or Desktop to print.
        </div>
      )}

      <div className="flex gap-4 mb-2">
        <button
          type="button"
          className={`${modeToggleButtonBase} ${
            mode === "image" ? modeToggleButtonActive : modeToggleButtonInactive
          }`}
          onClick={() => setMode("image")}
          title="Image Mode"
        >
          <Image
            size={32}
            strokeWidth={2.5}
          />
        </button>
        <button
          type="button"
          className={`${modeToggleButtonBase} ${
            mode === "text" ? modeToggleButtonActive : modeToggleButtonInactive
          }`}
          onClick={() => setMode("text")}
          title="Text Mode"
        >
          <AlignLeft
            size={32}
            strokeWidth={2.5}
          />
        </button>
      </div>

      <div
        id="preview-container"
        style={{ fontFamily: FONT_FAMILY }}
        className={[
          "box-content w-[384px] min-h-[384px] bg-white shadow-[0_10px_20px_rgba(0,0,0,0.19),0_6px_6px_rgba(0,0,0,0.23)] rounded-sm p-[10px] z-0",
          mode === "image"
            ? "cursor-pointer flex flex-col items-center justify-center"
            : "cursor-text flex flex-col items-stretch justify-start",
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
            className="pointer-events-none flex h-[384px] w-full flex-col items-center justify-center text-center text-zinc-400"
          >
            <span className="font-sans text-sm font-medium text-zinc-900">
              Select image
            </span>
            <span className="mt-1 font-sans text-xs text-zinc-400">
              or paste / drop here
            </span>
          </div>
        )}

        {mode === "text" && (
          <textarea
            ref={textArea}
            className="min-h-[384px] w-full resize-none bg-transparent p-2 outline-none placeholder:text-zinc-300"
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
            "h-auto w-full pointer-events-none pixelated block",
            photoImageData ? "block" : "hidden",
          ]
            .filter(Boolean)
            .join(" ")}
        ></canvas>
      </div>

      <button
        id="print-button"
        type="button"
        className="font-hand text-5xl text-white bg-black px-8 py-2 -mt-6 z-10 -rotate-2 hover:rotate-0 transition-transform disabled:bg-black disabled:opacity-50 disabled:cursor-not-allowed shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)]"
        onClick={onPrintClick}
        disabled={!isBluetoothAvailable}
      >
        print
      </button>

      <input
        type="file"
        id="image-input"
        accept="image/*"
        className="hidden"
        ref={imageInput}
        onChange={onImageInputChange}
      />
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
