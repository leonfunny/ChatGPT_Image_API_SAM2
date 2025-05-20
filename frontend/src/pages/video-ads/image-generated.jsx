import React, { useState } from "react";
import {
  Copy,
  Check,
  Film,
  Image as ImageIcon,
  Loader2,
  Upload,
  Plus,
  X,
  Check as CheckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ImageGenerated = ({
  shot,
  index,
  generatingImageStates,
  generatedImages,
  copyPrompt,
  copiedPromptInfo,
  onGenerateImage,
  onUploadImage,
  onSelectImage,
}) => {
  const [uploadedImages, setUploadedImages] = useState(
    shot.uploadedImages || []
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(
    shot.selectedImageIndex || 0
  );

  // Combine all images (generated and uploaded)
  const allImages = [
    ...(shot.generatedImage ? [shot.generatedImage] : []),
    ...(generatedImages[index] ? [generatedImages[index]] : []),
    ...uploadedImages,
  ]
    .filter(Boolean)
    .slice(0, 3); // Limit to 3 images

  const canGenerateMoreImages = allImages.length < 3;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (allImages.length >= 3) {
      alert("Maximum of 3 images allowed. Please delete an image first.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const newImages = [...uploadedImages, event.target.result];
      setUploadedImages(newImages);
      if (onUploadImage) {
        onUploadImage(index, newImages);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (imgIndex) => {
    const newImages = uploadedImages.filter((_, i) => i !== imgIndex);
    setUploadedImages(newImages);
    if (onUploadImage) {
      onUploadImage(index, newImages);
    }

    // If the selected image is removed, select the first available image
    if (
      selectedImageIndex === imgIndex ||
      selectedImageIndex >= newImages.length
    ) {
      setSelectedImageIndex(0);
      if (onSelectImage) {
        onSelectImage(index, 0);
      }
    }
  };

  const handleSelectImage = (imgIndex) => {
    setSelectedImageIndex(imgIndex);
    if (onSelectImage) {
      onSelectImage(index, imgIndex);
    }
  };

  return (
    <div>
      <div className="mt-3 border-t border-gray-200 pt-3">
        <div className="mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ImageIcon size={14} className="mr-1" />
              <div className="text-xs font-medium text-gray-500">
                Image Prompt:
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => copyPrompt(index, "image")}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                disabled={!shot.image_start_prompt}
              >
                {copiedPromptInfo.index === index &&
                copiedPromptInfo.type === "image" ? (
                  <Check size={12} className="mr-1" />
                ) : (
                  <Copy size={12} className="mr-1" />
                )}
                Copy
              </Button>
              <Button
                onClick={() => onGenerateImage && onGenerateImage(index)}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                disabled={
                  !shot.image_start_prompt ||
                  !canGenerateMoreImages ||
                  generatingImageStates[index]
                }
              >
                {generatingImageStates[index] ? (
                  <Loader2 size={12} className="mr-1 animate-spin" />
                ) : (
                  <Plus size={12} className="mr-1" />
                )}
                {generatingImageStates[index] ? "Generating..." : "Generate"}
              </Button>
            </div>
          </div>
          <div className="text-sm mt-1 bg-gray-50 p-2 rounded">
            {shot.image_start_prompt || "Not generated"}
          </div>
        </div>

        {/* Image Result Section - Moved up above Video Prompt */}
        <div className="mt-3 border-t border-gray-200 pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <ImageIcon size={14} className="mr-1" />
              <div className="text-xs font-medium text-gray-500">
                Image Results: ({allImages.length}/3)
              </div>
            </div>

            {/* Upload button */}
            {allImages.length < 3 && (
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                >
                  <Upload size={12} className="mr-1" />
                  Upload
                </Button>
              </div>
            )}
          </div>

          {generatingImageStates[index] && allImages.length === 0 ? (
            <div className="flex items-center justify-center h-40 bg-gray-50 rounded">
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="mt-2 text-sm text-gray-500">
                  Generating image...
                </p>
              </div>
            </div>
          ) : allImages.length > 0 ? (
            <div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {allImages.map((imageUrl, imgIndex) => (
                  <div
                    key={imgIndex}
                    className={`relative h-32 bg-gray-50 rounded overflow-hidden border-2 ${
                      selectedImageIndex === imgIndex
                        ? "border-blue-500"
                        : "border-gray-200"
                    }`}
                    onClick={() => handleSelectImage(imgIndex)}
                  >
                    <img
                      src={imageUrl}
                      alt={`Image result ${imgIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 right-1 flex gap-1">
                      {selectedImageIndex === imgIndex && (
                        <div className="bg-blue-500 rounded-full p-1">
                          <CheckIcon size={12} className="text-white" />
                        </div>
                      )}
                      {uploadedImages.includes(imageUrl) && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(uploadedImages.indexOf(imageUrl));
                          }}
                          className="bg-red-500 rounded-full p-1"
                        >
                          <X size={12} className="text-white" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Display selected image larger */}
              <div className="relative h-64 bg-gray-50 rounded overflow-hidden">
                <img
                  src={allImages[selectedImageIndex]}
                  alt={`Selected image result`}
                  className="w-full h-full object-contain"
                  style={{
                    border: "1px solid #ddd",
                    backgroundColor: "#f8f9fa",
                  }}
                />
                <div className="absolute bottom-2 right-2 bg-white bg-opacity-80 rounded px-2 py-1 text-xs">
                  <a
                    href={allImages[selectedImageIndex]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Open in new tab
                  </a>
                </div>
              </div>

              <div className="mt-2 text-xs">
                <span className="text-gray-600">Image URL: </span>
                <a
                  href={allImages[selectedImageIndex]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 break-all hover:underline"
                >
                  {allImages[selectedImageIndex]}
                </a>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 bg-gray-50 rounded border border-dashed border-gray-300">
              <p className="text-sm text-gray-500">
                No images available for this shot
              </p>
            </div>
          )}
        </div>

        {/* Video Prompt Section - Now below Image Results */}
        <div className="mt-3 border-t border-gray-200 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Film size={14} className="mr-1" />
              <div className="text-xs font-medium text-gray-500">
                Video Prompt:
              </div>
            </div>
            <Button
              onClick={() => copyPrompt(index, "video")}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              disabled={!shot.ai_video_prompt}
            >
              {copiedPromptInfo.index === index &&
              copiedPromptInfo.type === "video" ? (
                <Check size={12} className="mr-1" />
              ) : (
                <Copy size={12} className="mr-1" />
              )}
              Copy
            </Button>
          </div>
          <div className="text-sm mt-1 bg-gray-50 p-2 rounded">
            {shot.ai_video_prompt || "Not generated"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageGenerated;
