import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Save, Edit, XCircle } from "lucide-react";

const MarkEditor = ({
  onImageCreated,
  onMaskCreated,
  initialImage = null,
  className = "",
}) => {
  const [image, setImage] = useState(initialImage);
  const [isEditing, setIsEditing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawing = useRef(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const imgToUse = initialImage || image;
    if (imgToUse) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.setAttribute("data-original-width", img.width);
        canvas.setAttribute("data-original-height", img.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.lineWidth = brushSize;
        ctx.strokeStyle = "white";
        ctx.lineCap = "round";
        ctxRef.current = ctx;

        if (!initialImage && image) {
          canvas.toBlob((blob) => {
            const file = new File([blob], "original-image.png", {
              type: "image/png",
            });
            onImageCreated &&
              onImageCreated({
                file,
                preview: URL.createObjectURL(blob),
              });
          }, "image/png");
        }
      };

      if (typeof imgToUse === "string") {
        img.src = imgToUse;
      } else if (imgToUse instanceof File) {
        img.src = URL.createObjectURL(imgToUse);
      } else if (imgToUse && imgToUse.preview) {
        img.src = imgToUse.preview;
      }
    }
  }, [image, initialImage]);

  // Update brush size when it changes
  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.lineWidth = brushSize;
    }
  }, [brushSize]);

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current.click();
  };

  const clearCanvas = () => {
    if (image || initialImage) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };

      if (typeof image === "string" || typeof initialImage === "string") {
        img.src = image || initialImage;
      } else if (image instanceof File || initialImage instanceof File) {
        img.src = URL.createObjectURL(image || initialImage);
      } else if (
        (image && image.preview) ||
        (initialImage && initialImage.preview)
      ) {
        img.src =
          (image && image.preview) || (initialImage && initialImage.preview);
      }
    }
  };

  // Improved function to get the correct coordinates based on canvas scaling
  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const originalWidth = parseInt(
      canvas.getAttribute("data-original-width") || canvas.width
    );
    const originalHeight = parseInt(
      canvas.getAttribute("data-original-height") || canvas.height
    );

    const scaleX = originalWidth / rect.width;
    const scaleY = originalHeight / rect.height;

    let clientX, clientY;

    if (e.nativeEvent) {
      clientX = e.nativeEvent.clientX;
      clientY = e.nativeEvent.clientY;
    } else if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      return { x: 0, y: 0 };
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    return { x, y };
  };

  const handleMouseDown = (e) => {
    if (!isEditing) return;
    isDrawing.current = true;
    const ctx = ctxRef.current;
    const { x, y } = getCanvasCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current || !isEditing) return;
    const ctx = ctxRef.current;
    const { x, y } = getCanvasCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    handleMouseDown(e);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    handleMouseMove(e);
  };

  const handleTouchEnd = () => {
    handleMouseUp();
  };

  const makeWhiteTransparent = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (r > 240 && g > 240 && b > 240) {
        data[i + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    canvas.toBlob((blob) => {
      const file = new File([blob], "mask-image.png", { type: "image/png" });
      onMaskCreated &&
        onMaskCreated({
          file,
          preview: URL.createObjectURL(blob),
        });
      setIsEditing(false);
    }, "image/png");
  };

  // Helper function to properly resize the canvas when window size changes
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || (!image && !initialImage)) return;

    const originalWidth = parseInt(canvas.getAttribute("data-original-width"));
    const originalHeight = parseInt(
      canvas.getAttribute("data-original-height")
    );

    if (!originalWidth || !originalHeight) return;

    const containerWidth = canvas.parentElement.clientWidth;
    const scale = Math.min(1, containerWidth / originalWidth);
    canvas.style.width = `${originalWidth * scale}px`;
    canvas.style.height = `${originalHeight * scale}px`;
  };

  // Add a resize event listener
  useEffect(() => {
    window.addEventListener("resize", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  useEffect(() => {
    if (image || initialImage) {
      const timeout = setTimeout(resizeCanvas, 100);
      return () => clearTimeout(timeout);
    }
  }, [image, initialImage]);

  return (
    <div className={`space-y-4 ${className}`}>
      <Card className="border-dashed">
        <CardContent className="pt-6">
          {!image && !initialImage ? (
            <div
              className="flex flex-col items-center justify-center rounded-md border border-dashed border-muted-foreground/50 p-10 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={triggerFileUpload}
            >
              <Upload className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drag and drop or click to upload image
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG up to 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setIsEditing((prev) => !prev)}
                    variant={isEditing ? "default" : "outline"}
                    size="sm"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    {isEditing ? "Stop Editing" : "Edit Mask"}
                  </Button>

                  {isEditing && (
                    <Button variant="outline" size="sm" onClick={clearCanvas}>
                      <XCircle className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                {isEditing && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={makeWhiteTransparent}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save Mask
                  </Button>
                )}
              </div>

              {isEditing && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-1">
                    Brush Size: {brushSize}px
                  </p>
                  <Slider
                    min={20}
                    max={100}
                    step={1}
                    value={[brushSize]}
                    onValueChange={(val) => setBrushSize(val[0])}
                  />
                </div>
              )}

              <div className="relative rounded-md overflow-hidden">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="max-w-full max-h-full mx-auto"
                  style={{
                    cursor: isEditing
                      ? `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${
                          brushSize / 1.5
                        }" height="${brushSize / 1.5}" viewBox="0 0 ${
                          brushSize / 1.5
                        } ${brushSize / 1.5}"><circle cx="${
                          brushSize / 3
                        }" cy="${brushSize / 3}" r="${
                          brushSize / 3 - 1
                        }" fill="%23FFF" stroke="%23000" stroke-width="1"></circle></svg>') ${
                          brushSize / 3
                        } ${brushSize / 3}, auto`
                      : "default",
                    height: "auto",
                    width: "auto",
                    objectFit: "contain",
                  }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MarkEditor;
