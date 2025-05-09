import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, X, Edit } from "lucide-react";
import { ReactPhotoEditor } from "@/components/image-editor";

const SingleImageUpload = ({
  mainImage,
  maskImage,
  onMainImageUpload,
  onRemoveMainImage,
  onMaskCreated,
  onImageCreated,
}) => {
  const mainImageInputRef = useRef(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const triggerMainImageUpload = () => {
    mainImageInputRef.current.click();
  };

  const handleMainImageUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onMainImageUpload({
        file,
        preview: URL.createObjectURL(file),
      });
    }
  };

  const handleSaveImage = async (editedFile) => {
    if (editedFile) {
      createTransparentImage(editedFile).then((transparentFile) => {
        const preview = URL.createObjectURL(transparentFile);
        onImageCreated({ file: transparentFile, preview });

        // Tạo mask cho vùng đã vẽ
        createMaskFromEditedImage(editedFile);
      });
    }
    setIsEditorOpen(false);
  };

  const createTransparentImage = (editedFile) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        // Lấy dữ liệu pixel
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Chuyển các pixel trắng thành trong suốt
        // Threshold cho màu trắng: R, G, B > 240
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
          const transparentFile = new File([blob], "transparent-image.png", {
            type: "image/png",
          });
          resolve(transparentFile);
        }, "image/png");
      };

      img.src = URL.createObjectURL(editedFile);
    });
  };

  const createMaskFromEditedImage = (editedFile) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      // Lấy dữ liệu pixel
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Chuyển dữ liệu thành mask: các vùng trắng sẽ trở thành đen (mask vùng),
      // phần còn lại sẽ trở thành transparent
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (r > 240 && g > 240 && b > 240) {
          // Vùng đã vẽ (trắng) -> chuyển thành đen đặc (mask)
          data[i] = 0; // R = 0
          data[i + 1] = 0; // G = 0
          data[i + 2] = 0; // B = 0
          data[i + 3] = 255; // Alpha = 255 (đặc)
        } else {
          // Vùng không vẽ -> transparent hoàn toàn
          data[i + 3] = 0; // Alpha = 0 (trong suốt)
        }
      }

      // Ghi dữ liệu trở lại canvas
      ctx.putImageData(imageData, 0, 0);

      // Chuyển canvas thành file
      canvas.toBlob((blob) => {
        const maskFile = new File([blob], "mask-image.png", {
          type: "image/png",
        });

        onMaskCreated &&
          onMaskCreated({
            file: maskFile,
            preview: URL.createObjectURL(blob),
          });
      }, "image/png");
    };

    img.src = URL.createObjectURL(editedFile);
  };

  const openEditor = () => {
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
  };

  return (
    <>
      <Card className="border-dashed">
        <CardContent className="pt-6">
          {mainImage?.preview ? (
            <div className="relative rounded-md overflow-hidden bg-muted">
              <img
                src={mainImage.preview}
                alt="Main image preview"
                className="mx-auto max-h-64 object-contain"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={openEditor}
                  title="Edit image"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={onRemoveMainImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center rounded-md border border-dashed border-muted-foreground/50 p-10 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={triggerMainImageUpload}
            >
              <Upload className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drag and drop or click to upload main image
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG up to 10MB
              </p>
            </div>
          )}
          <input
            ref={mainImageInputRef}
            type="file"
            className="hidden"
            onChange={handleMainImageUpload}
            accept="image/*"
          />
        </CardContent>
      </Card>

      {mainImage && mainImage.file && (
        <ReactPhotoEditor
          file={mainImage.file}
          open={isEditorOpen}
          onClose={closeEditor}
          onSaveImage={handleSaveImage}
          allowDrawing={true}
          modalHeight="80vh"
          modalWidth="80vw"
          maxCanvasHeight="70vh"
          maxCanvasWidth="70vw"
          labels={{
            close: "Cancel",
            save: "Save",
            reset: "Reset photo",
            draw: "Draw",
            brushColor: "Màu vẽ",
            brushWidth: "Độ rộng nét vẽ",
          }}
        />
      )}

      {mainImage && maskImage && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-700 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            Mask created successfully. Inpainting will be applied to masked
            areas.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};

export default SingleImageUpload;
