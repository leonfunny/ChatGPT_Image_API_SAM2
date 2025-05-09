import { useEffect } from "react";
import { usePhotoEditor } from "./usePhotoEditor";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Brush, RotateCcw } from "lucide-react"; // Import các biểu tượng từ Lucide

export const ReactPhotoEditor = ({
  file,
  onSaveImage,
  allowDrawing = true,
  downloadOnSave,
  open,
  onClose,
  modalHeight,
  modalWidth,
  canvasHeight,
  canvasWidth,
  maxCanvasHeight,
  maxCanvasWidth,
  labels = {
    close: "Close",
    save: "Save",
    reset: "Reset photo",
    draw: "Draw",
    brushColor: "Choose brush color",
    brushWidth: "Choose brush width",
  },
}) => {
  const {
    canvasRef,
    mode,
    setMode,
    setLineWidth,
    lineWidth,
    handlePointerDown,
    handlePointerUp,
    handlePointerMove,
    resetFilters,
    downloadImage,
    generateEditedFile,
    imageResolution,
    scaleFactor,
  } = usePhotoEditor({ file });

  // Hàm này tạo một điểm tròn có kích thước tự động điều chỉnh theo độ phân giải
  const getCustomCursor = (brushSize) => {
    // Tính toán kích thước hiển thị của brush dựa trên tỷ lệ scaleFactor
    const visualBrushSize = Math.max(
      2,
      Math.round(brushSize / (scaleFactor || 1))
    );

    // Vẫn sử dụng cursor tùy chỉnh vì cần hiển thị kích thước brush trực quan
    return `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${visualBrushSize}" height="${visualBrushSize}" viewBox="0 0 ${visualBrushSize} ${visualBrushSize}"><circle cx="${
      visualBrushSize / 2
    }" cy="${visualBrushSize / 2}" r="${
      visualBrushSize / 2 - 1
    }" fill="%23FFF" stroke="%23000" stroke-width="1"></circle></svg>') ${
      visualBrushSize / 2
    } ${visualBrushSize / 2}, auto`;
  };

  useEffect(() => {
    if (open) {
      resetFilters();
    }
  }, [open]);

  // Cập nhật con trỏ chuột khi lineWidth hoặc mode thay đổi
  useEffect(() => {
    if (canvasRef.current && mode === "draw") {
      canvasRef.current.style.cursor = getCustomCursor(lineWidth);
    } else if (canvasRef.current && mode === "pan") {
      canvasRef.current.style.cursor = "grab";
    }
  }, [lineWidth, mode, scaleFactor, imageResolution]);

  const handleInputChange = (event, setValue, min, max) => {
    const value = parseInt(event.target?.value);
    if (!isNaN(value) && value >= min && value <= max) {
      setValue(value);
    }
  };

  const renderInputs = [];

  const closeEditor = () => {
    resetFilters();
    if (onClose) {
      onClose();
    }
  };

  const saveImage = async () => {
    if (downloadOnSave) {
      downloadImage();
    }
    const editedFile = await generateEditedFile();
    editedFile && onSaveImage(editedFile);
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {open && (
        <>
          <div
            data-testid="photo-editor-main"
            className="fixed inset-0 z-50 flex items-center justify-center overflow-auto"
          >
            <div
              style={{
                height: modalHeight ?? "38rem",
                width: modalWidth ?? "40rem",
              }}
              id="photo-editor-modal"
              className="relative rounded-lg shadow-lg bg-white dark:bg-[#1e1e1e] max-sm:w-[22rem]"
            >
              <div className="flex justify-end p-2 rounded-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2 rounded-full px-2 py-1"
                  onClick={closeEditor}
                >
                  {labels.close}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2 rounded-full px-2 py-1"
                  onClick={() => void saveImage()}
                  data-testid="save-button"
                >
                  {labels.save}
                </Button>
              </div>
              <div className="p-2">
                <div className="flex flex-col">
                  <canvas
                    style={{
                      width: canvasWidth ?? "auto",
                      height: canvasHeight ?? "auto",
                      maxHeight: maxCanvasHeight ?? "22rem",
                      maxWidth: maxCanvasWidth ?? "36rem",
                      cursor:
                        mode === "draw"
                          ? getCustomCursor(lineWidth)
                          : mode === "pan"
                          ? "grab"
                          : "auto",
                    }}
                    className="touch-none border dark:border-gray-700 object-fill mx-auto"
                    data-testid="image-editor-canvas"
                    id="rpe-canvas"
                    ref={canvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    width={
                      typeof canvasWidth === "number" ? canvasWidth : undefined
                    }
                    height={
                      typeof canvasHeight === "number"
                        ? canvasHeight
                        : undefined
                    }
                  />
                  <div className="flex items-center m-1 flex-col">
                    <div className="flex flex-col gap-1 mt-4 w-11/12 absolute bottom-12 max-sm:w-72">
                      {renderInputs.map(
                        (input) =>
                          !input.hide && (
                            <div
                              key={input.name}
                              className="flex flex-row items-center"
                            >
                              <label
                                id={`${input.name}InputLabel`}
                                className="text-xs font-medium text-gray-900 dark:text-white w-10"
                                htmlFor={input.id}
                              >
                                {input.name[0].toUpperCase() +
                                  input.name.slice(1)}
                                :{" "}
                              </label>
                              <Slider
                                id={input.id}
                                value={[input.value]}
                                step={1}
                                min={input.min}
                                max={input.max}
                                onValueChange={(value) =>
                                  input.setValue(value[0])
                                }
                                className="ml-6 w-full h-1"
                                aria-labelledby={`${input.name}InputLabel`}
                              />
                              <Input
                                type="number"
                                value={input.value}
                                onChange={(e) =>
                                  handleInputChange(
                                    e,
                                    input.setValue,
                                    input.min,
                                    input.max
                                  )
                                }
                                min={input.min}
                                max={input.max}
                                className="w-14 ml-2 text-right"
                                aria-labelledby={`${input.name}InputLabel`}
                              />
                            </div>
                          )
                      )}
                    </div>
                  </div>
                  <div className="flex justify-center items-center content-center">
                    <div className="absolute top top-0 mt-2 flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        title={labels.reset}
                        className="mx-1 cursor-pointer rounded-md p-1 focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700"
                        onClick={resetFilters}
                        aria-label={labels.reset}
                      >
                        <RotateCcw className="h-6 w-6 dark:stroke-slate-200" />
                      </Button>

                      {allowDrawing && (
                        <div className="flex items-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid="draw-btn"
                            className="mx-1 rounded-md cursor-pointer p-1 focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700"
                            onClick={() =>
                              mode == "pan" ? setMode("draw") : setMode("pan")
                            }
                            title={labels.draw}
                            aria-label={labels.draw}
                          >
                            <Brush className="h-6 w-6  dark:stroke-slate-200" />
                          </Button>
                          {mode == "draw" && (
                            <div className="flex items-center dark:bg-zinc-600 bg-zinc-200 p-1 rounded-md">
                              <div className="flex items-center mx-1">
                                <label
                                  htmlFor="brush-width-slider"
                                  className="sr-only"
                                >
                                  {labels.brushWidth}
                                </label>
                                <Slider
                                  id="brush-width-slider"
                                  min={2}
                                  max={100}
                                  step={1}
                                  value={[lineWidth]}
                                  onValueChange={(value) =>
                                    setLineWidth(value[0])
                                  }
                                  className="w-24 h-1"
                                  title={labels.brushWidth}
                                  aria-label={labels.brushWidth}
                                />
                              </div>
                              <Input
                                type="number"
                                title={labels.brushWidth}
                                aria-label={labels.brushWidth}
                                onChange={(e) =>
                                  handleInputChange(e, setLineWidth, 2, 100)
                                }
                                className="w-12 ml-2 text-right text-sm mx-1 p-0"
                                id="rpe-brush-width"
                                value={lineWidth}
                                min={2}
                                max={100}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="fixed inset-0 z-40 bg-black opacity-75"></div>
        </>
      )}
    </>
  );
};
