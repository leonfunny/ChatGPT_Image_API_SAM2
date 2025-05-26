import React, { useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";

const MultipleImageUpload = ({
  uploadedImages,
  onImageUpload,
  onImageRemove,
}) => {
  const multipleImagesInputRef = useRef(null);

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles && acceptedFiles.length) {
        const newImages = acceptedFiles.map((file) => ({
          file,
          preview: URL.createObjectURL(file),
        }));
        onImageUpload(newImages);
      }
    },
    [onImageUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    maxSize: 10485760, // 10MB
  });

  const handleMultipleImageUpload = (e) => {
    if (e.target.files && e.target.files.length) {
      const files = Array.from(e.target.files);
      const newImages = files.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      onImageUpload(newImages);
    }
  };

  return (
    <div
      {...getRootProps({
        className: `space-y-4 ${isDragActive ? "relative" : ""}`,
      })}
    >
      <Label>Upload Multiple Images</Label>

      {isDragActive && (
        <div className="absolute inset-0 bg-primary/20 border-2 border-primary border-dashed rounded-lg flex items-center justify-center z-10"></div>
      )}

      <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
        {uploadedImages.map((image, index) => (
          <div
            key={index}
            className="relative rounded-md overflow-hidden bg-muted group"
            onClick={(e) => e.stopPropagation()} // Prevent triggering the dropzone
          >
            <img
              src={image.preview}
              alt={`Upload ${index + 1}`}
              className="h-24 w-full object-cover"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-70 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering the dropzone
                onImageRemove(index);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
            <div className="absolute bottom-0 left-0 right-0 bg-background/70 text-xs p-1 text-center truncate">
              Image #{index + 1}
            </div>
          </div>
        ))}
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-muted-foreground/50 p-4 h-24 cursor-pointer hover:bg-accent/50 transition-colors">
          <Plus className="h-8 w-8 text-muted-foreground mb-1" />
          <p className="text-xs text-muted-foreground text-center">
            Add Images
          </p>
        </div>
      </div>

      <input {...getInputProps()} />

      <input
        ref={multipleImagesInputRef}
        type="file"
        className="hidden"
        onChange={handleMultipleImageUpload}
        accept="image/*"
        multiple
      />

      <p className="text-xs text-muted-foreground mt-1">
        Drag and drop multiple images here, or click to select images. PNG, JPG
      </p>
    </div>
  );
};

export default MultipleImageUpload;
