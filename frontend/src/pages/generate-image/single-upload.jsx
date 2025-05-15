import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
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
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles && acceptedFiles[0]) {
        const file = acceptedFiles[0];
        onMainImageUpload({
          file,
          preview: URL.createObjectURL(file),
        });
      }
    },
    [onMainImageUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    maxSize: 10485760, // 10MB
    maxFiles: 1,
  });

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
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 255;
        } else {
          data[i + 3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);

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
              {...getRootProps()}
              className={`flex flex-col cursor-pointer items-center justify-center rounded-md border-2 border-dashed p-10 transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/10"
                  : "border-muted-foreground/50 hover:bg-accent/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {isDragActive
                  ? "Drag 'n' drop the files here ..."
                  : "Click to select files or drag and drop"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG up to 10MB
              </p>
            </div>
          )}
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
            close: "Hủy",
            save: "Lưu",
            reset: "Đặt lại ảnh",
            draw: "Vẽ",
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
