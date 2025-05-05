import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";

const MultipleImageUpload = ({
  uploadedImages,
  onImageUpload,
  onImageRemove,
}) => {
  // Create ref for the file input
  const multipleImagesInputRef = useRef(null);

  // Function to trigger the file input
  const triggerMultipleImageUpload = () => {
    multipleImagesInputRef.current.click();
  };

  // Handle the file input change
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
    <div className="space-y-4">
      <Label>Upload Multiple Images</Label>
      <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
        {uploadedImages.map((image, index) => (
          <div
            key={index}
            className="relative rounded-md overflow-hidden bg-muted group"
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
              onClick={() => onImageRemove(index)}
            >
              <X className="h-3 w-3" />
            </Button>
            <div className="absolute bottom-0 left-0 right-0 bg-background/70 text-xs p-1 text-center truncate">
              Image #{index + 1}
            </div>
          </div>
        ))}
        <div
          className="flex flex-col items-center justify-center rounded-md border border-dashed border-muted-foreground/50 p-4 h-24 cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={triggerMultipleImageUpload}
        >
          <Plus className="h-8 w-8 text-muted-foreground mb-1" />
          <p className="text-xs text-muted-foreground text-center">
            Add Images
          </p>
        </div>
      </div>
      <input
        ref={multipleImagesInputRef}
        type="file"
        className="hidden"
        onChange={handleMultipleImageUpload}
        accept="image/*"
        multiple
      />
    </div>
  );
};

export default MultipleImageUpload;
