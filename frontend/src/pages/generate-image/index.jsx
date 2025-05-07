/* eslint-disable react/no-unknown-property */
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  X,
  Settings,
  RectangleHorizontal,
  SquareUser,
  Square,
  Image as ImageIcon,
  Loader2,
  Download,
  PenLine,
  Edit,
  AlertTriangle,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import SingleImageUpload from "./single-upload";
import MultipleImageUpload from "./multiple-upload";
import { generate, editImage, batchEditImage } from "@/services/generate-image";

function GenerateImagePage() {
  const [prompt, setPrompt] = useState("");
  const [mainImage, setMainImage] = useState(null);
  const [maskImage, setMaskImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [activeTab, setActiveTab] = useState("upload");
  const [error, setError] = useState(null);
  const [model, setModel] = useState("gpt-image-1");
  const [imageSize, setImageSize] = useState("1024x1024");
  const [quality, setQuality] = useState("auto");
  const [uploadedImages, setUploadedImages] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [editMode, setEditMode] = useState("single");
  const [imageCollection, setImageCollection] = useState([]);

  const modelOptions = {
    "gpt-image-1": {
      sizes: [
        { value: "1024x1024", label: "Square (1024×1024)", icon: Square },
        {
          value: "1536x1024",
          label: "Landscape (1536×1024)",
          icon: RectangleHorizontal,
        },
        { value: "1024x1536", label: "Portrait (1024×1536)", icon: SquareUser },
        { value: "auto", label: "Auto (Default)", icon: Settings },
      ],
      qualities: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
        { value: "auto", label: "Auto (Default)" },
      ],
    },
    "dall-e-2": {
      sizes: [
        { value: "256x256", label: "Small (256×256)", icon: Square },
        { value: "512x512", label: "Medium (512×512)", icon: Square },
        { value: "1024x1024", label: "Large (1024×1024)", icon: Square },
      ],
      qualities: [{ value: "standard", label: "Standard (Default)" }],
    },
    "dall-e-3": {
      sizes: [
        { value: "1024x1024", label: "Square (1024×1024)", icon: Square },
        { value: "1024x1792", label: "Portrait (1024×1792)", icon: SquareUser },
        {
          value: "1792x1024",
          label: "Landscape (1792×1024)",
          icon: RectangleHorizontal,
        },
        { value: "auto", label: "Auto (Default)", icon: Settings },
      ],
      qualities: [
        { value: "standard", label: "Standard (Default)" },
        { value: "hd", label: "HD" },
      ],
    },
  };

  // Update size and quality when model changes
  useEffect(() => {
    // Set default size for the selected model
    const defaultSize = model === "dall-e-2" ? "1024x1024" : "1024x1024";
    setImageSize(defaultSize);

    // Set default quality for the selected model
    const defaultQuality = model === "gpt-image-1" ? "auto" : "standard";
    setQuality(defaultQuality);

    // Reset edit mode to "single" and clear images when DALL-E 3 is selected
    if (model === "dall-e-3") {
      setEditMode("single");
      if (mainImage?.preview) {
        URL.revokeObjectURL(mainImage.preview);
      }
      setMainImage(null);
      setMaskImage(null);
      setUploadedImages([]);
      setError(null);
    }

    // Show notification for DALL-E 2
    if (model === "dall-e-2") {
      setError("Dall-e-2 only support Edit image Inpainting");
    } else {
      setError(null);
    }
  }, [model]);

  const addToCollection = (imageUrl, imageType = "generated") => {
    const newImage = {
      id: Date.now(),
      url: imageUrl,
      type: imageType,
      createdAt: new Date(),
    };
    setImageCollection((prev) => [...prev, newImage]);
  };

  const removeFromCollection = (index) => {
    setImageCollection((prev) => prev.filter((_, i) => i !== index));
    if (selectedImageIndex === index) {
      setSelectedImageIndex(null);
    } else if (selectedImageIndex > index) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  const selectImageForEditing = (index) => {
    // Don't allow editing if DALL-E 3 is selected
    if (model === "dall-e-3") {
      setError(
        "Image editing is not available with DALL-E 3. Please select a different model to edit images."
      );
      return;
    }

    const selectedImage = imageCollection[index];

    fetch(selectedImage.url)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `image-${selectedImage.id}.png`, {
          type: "image/png",
        });
        setMainImage({
          file,
          preview: selectedImage.url,
        });
        setMaskImage(null);
        setSelectedImageIndex(index);
        setEditMode("single");
        setActiveTab("upload");
      });
  };

  // Functions for single image upload
  const handleMainImageUpload = (imageObj) => {
    setMainImage(imageObj);
  };

  const removeMainImage = () => {
    if (mainImage?.preview) {
      URL.revokeObjectURL(mainImage.preview);
    }

    setMainImage(null);

    if (maskImage) {
      setMaskImage(null);
    }
  };

  // Handle receiving the image and mask from MarkEditor
  const handleImageFromMarkEditor = (imageObj) => {
    setMainImage(imageObj);
  };

  const handleMaskFromMarkEditor = (maskObj) => {
    setMaskImage(maskObj);
  };

  // Functions for multiple image upload
  const handleMultipleImageUpload = (newImages) => {
    setUploadedImages([...uploadedImages, ...newImages]);
  };

  const removeUploadedImage = (index) => {
    setUploadedImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  // TanStack Query mutation for image generation
  const generateMutation = useMutation({
    mutationFn: (imageData) => {
      setError(null);

      return generate(imageData);
    },
    onSuccess: (response) => {
      if (response && response.image_url) {
        setResultImage(response.image_url);
        addToCollection(response.image_url, "generated");
      }
    },
    onError: (error) => {
      setError(
        error.response?.data?.detail ||
          "Something went wrong. Please try again."
      );
    },
  });

  // TanStack Query mutation for image editing (single image)
  const editMutation = useMutation({
    mutationFn: async (editData) => {
      setError(null);
      const formData = new FormData();
      formData.append("prompt", editData.prompt);
      formData.append("model", editData.model);
      formData.append("size", editData.size);
      formData.append("output_format", editData.output_format);

      if (editData.output_compression !== null) {
        formData.append("output_compression", editData.output_compression);
      }

      formData.append("image", editData.image);

      if (editData.mask) {
        formData.append("mask", editData.mask);
      }
      return editImage(formData);
    },
    onSuccess: (response) => {
      if (response && response.image_url) {
        setResultImage(response.image_url);
        addToCollection(response.image_url, "edited");
      }
    },
    onError: (error) => {
      setError(
        error.response?.data?.detail ||
          "Something went wrong. Please try again."
      );
    },
  });

  // TanStack Query mutation for batch image editing (multiple images)
  const batchEditMutation = useMutation({
    mutationFn: async (batchData) => {
      setError(null);

      const formData = new FormData();

      formData.append("prompt", batchData.prompt);
      formData.append("model", batchData.model);
      formData.append("size", batchData.size);
      formData.append("output_format", batchData.output_format);

      if (batchData.output_compression !== null) {
        formData.append("output_compression", batchData.output_compression);
      }

      batchData.images.forEach((image) => {
        formData.append("images", image);
      });

      return batchEditImage(formData);
    },
    onSuccess: (response) => {
      if (response && response.results && response.results.length > 0) {
        const results = response.results;

        results.forEach((result) => {
          addToCollection(result.image_url, "batch-edited");
        });

        if (results[0]) {
          setResultImage(results[0].image_url);
        }
      }
    },
    onError: (error) => {
      setError(
        error.response?.data?.detail ||
          "Something went wrong. Please try again."
      );
    },
  });

  const handleGenerateImage = () => {
    setError(null);

    if (model === "dall-e-3") {
      // For DALL-E 3, only allow standard image generation
      const requestData = {
        prompt: prompt,
        model: model,
        size: imageSize,
        quality: quality,
        background: "auto",
        output_format: "png",
        output_compression: 0,
      };

      generateMutation.mutate(requestData);
    } else if (editMode === "multiple" && uploadedImages.length > 0) {
      const batchData = {
        prompt: prompt,
        model: model,
        size: imageSize,
        output_format: "png",
        output_compression: 0,
        images: uploadedImages.map((img) => img.file),
      };

      batchEditMutation.mutate(batchData);
    } else if (mainImage) {
      const editData = {
        prompt: prompt,
        model: model,
        size: imageSize,
        output_format: "png",
        output_compression: 0,
        image: mainImage.file,
      };

      if (maskImage) {
        editData.mask = maskImage.file;
      }

      editMutation.mutate(editData);
    } else {
      const requestData = {
        prompt: prompt,
        model: model,
        size: imageSize,
        quality: quality,
        background: "auto",
        output_format: "png",
        output_compression: 0,
      };

      generateMutation.mutate(requestData);
    }
  };

  const handleDownload = () => {
    if (resultImage) {
      fetch(resultImage)
        .then((response) => response.blob())
        .then((blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `generated-image-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        })
        .catch(() => {
          setError("Failed to download the image.");
        });
    }
  };

  const dismissError = () => {
    setError(null);
  };

  const getButtonText = () => {
    if (
      generateMutation.isPending ||
      editMutation.isPending ||
      batchEditMutation.isPending
    ) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {model === "dall-e-3"
            ? "Generating..."
            : editMode === "multiple"
            ? "Editing Image References..."
            : mainImage
            ? maskImage
              ? "Editing with Mask..."
              : "Editing..."
            : "Generating..."}
        </>
      );
    }

    if (model === "dall-e-3") {
      return "Generate Image";
    }

    if (editMode === "multiple") {
      return `Editing ${uploadedImages.length} Image References`;
    }

    if (mainImage) {
      return maskImage ? "Edit with Mask (Inpainting)" : "Edit Image";
    }

    return "Generate Image";
  };

  const isLoading =
    generateMutation.isPending ||
    editMutation.isPending ||
    batchEditMutation.isPending;

  const handleGenerateImageWithProgress = () => {
    if (model === "dall-e-3") {
      // For DALL-E 3, only allow standard image generation
      const requestData = {
        prompt: prompt,
        model: model,
        size: imageSize,
        quality: quality,
        background: "auto",
        output_format: "png",
        output_compression: 0,
      };

      generateMutation.mutate(requestData);
    } else if (editMode === "multiple" && uploadedImages.length > 0) {
      const batchData = {
        prompt: prompt,
        model: model,
        size: imageSize,
        output_format: "png",
        output_compression: 0,
        images: uploadedImages.map((img) => img.file),
      };

      batchEditMutation.mutate(batchData, {
        onSuccess: () => {},
        onError: () => {},
      });
    } else {
      handleGenerateImage();
    }
  };

  // Check if we should show edit controls
  const showEditControls = model !== "dall-e-3";

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-3xl font-bold tracking-tight mb-6">
        Image{" "}
        {model === "dall-e-3"
          ? "Generator"
          : editMode === "multiple"
          ? "References"
          : mainImage
          ? "Editor"
          : "Generator"}
      </h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2"
            onClick={dismissError}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Input Parameters</CardTitle>
              <CardDescription>
                {showEditControls
                  ? "Describe what you want to generate and provide reference images"
                  : "Describe what you want to generate"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Edit Mode Selector - Only show if not DALL-E 3 */}
              {showEditControls && (
                <div className="space-y-2">
                  <Label>Edit Mode</Label>
                  <div className="flex space-x-4">
                    <Button
                      variant={editMode === "single" ? "default" : "outline"}
                      onClick={() => {
                        setEditMode("single");
                        if (editMode === "multiple") {
                          setUploadedImages([]);
                        }
                      }}
                      className="flex-1"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Single Image
                    </Button>
                    <Button
                      variant={editMode === "multiple" ? "default" : "outline"}
                      onClick={() => {
                        setEditMode("multiple");
                        if (editMode === "single") {
                          if (mainImage?.preview) {
                            URL.revokeObjectURL(mainImage.preview);
                          }
                          setMainImage(null);
                          setMaskImage(null);
                        }
                      }}
                      className="flex-1"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Multiple Images
                    </Button>
                  </div>
                </div>
              )}

              {/* Prompt Input */}
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe what you want to generate in detail..."
                  className="min-h-32 resize-none"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              {/* Model Options */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger id="model">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-image-1">GPT Image 1</SelectItem>
                      {editMode !== "multiple" && (
                        <>
                          <SelectItem value="dall-e-2">DALL-E 2</SelectItem>
                          <SelectItem value="dall-e-3">DALL-E 3</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quality">Quality</Label>
                  <Select value={quality} onValueChange={setQuality}>
                    <SelectTrigger id="quality">
                      <SelectValue placeholder="Select quality" />
                    </SelectTrigger>
                    <SelectContent>
                      {modelOptions[model].qualities.map((qualityOption) => (
                        <SelectItem
                          key={qualityOption.value}
                          value={qualityOption.value}
                        >
                          {qualityOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image-size">Image Size</Label>
                  <Select value={imageSize} onValueChange={setImageSize}>
                    <SelectTrigger id="image-size">
                      <SelectValue placeholder="Select image size" />
                    </SelectTrigger>
                    <SelectContent>
                      {modelOptions[model].sizes.map((sizeOption) => {
                        const IconComponent = sizeOption.icon;
                        return (
                          <SelectItem
                            key={sizeOption.value}
                            value={sizeOption.value}
                          >
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4" />
                              <span>{sizeOption.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {showEditControls && <Separator />}

              {/* Conditional render based on edit mode and model */}
              {showEditControls &&
                (editMode === "multiple" ? (
                  <MultipleImageUpload
                    uploadedImages={uploadedImages}
                    onImageUpload={handleMultipleImageUpload}
                    onImageRemove={removeUploadedImage}
                  />
                ) : (
                  <SingleImageUpload
                    mainImage={mainImage}
                    maskImage={maskImage}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onMainImageUpload={handleMainImageUpload}
                    onRemoveMainImage={removeMainImage}
                    onMaskCreated={handleMaskFromMarkEditor}
                    onImageCreated={handleImageFromMarkEditor}
                  />
                ))}
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                onClick={handleGenerateImageWithProgress}
                disabled={
                  isLoading ||
                  !prompt ||
                  (showEditControls &&
                    editMode === "single" &&
                    mainImage &&
                    !mainImage.file) ||
                  (showEditControls &&
                    editMode === "multiple" &&
                    uploadedImages.length === 0)
                }
              >
                {getButtonText()}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Result Card */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>
              {model === "dall-e-3"
                ? "Generated"
                : editMode === "multiple"
                ? "New Image Edited"
                : mainImage
                ? "Edited"
                : "Generated"}{" "}
              Result
            </CardTitle>
            <CardDescription>
              Your image will appear here after{" "}
              {model === "dall-e-3"
                ? "generation"
                : editMode === "multiple"
                ? "batch editing"
                : mainImage
                ? maskImage
                  ? "inpainting"
                  : "editing"
                : "generation"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-center justify-center p-6">
            <div className="w-full h-full min-h-64 bg-muted rounded-md flex items-center justify-center">
              {isLoading ? (
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                  <p className="mt-4 font-medium text-muted-foreground">
                    {model === "dall-e-3"
                      ? "Generating your image..."
                      : editMode === "multiple"
                      ? `Editing new image...`
                      : mainImage
                      ? maskImage
                        ? "Applying inpainting..."
                        : "Editing your image..."
                      : "Generating your image..."}
                  </p>
                </div>
              ) : resultImage ? (
                <img
                  src={resultImage}
                  alt="Generated result"
                  className="max-w-full max-h-full object-contain rounded-md"
                />
              ) : (
                <div className="text-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="mt-4 text-muted-foreground">
                    {model === "dall-e-3"
                      ? "Generated"
                      : editMode === "multiple"
                      ? "Edited "
                      : mainImage
                      ? "Edited"
                      : "Generated"}{" "}
                    image will appear here
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 items-start">
            {resultImage && (
              <>
                <Alert>
                  <AlertDescription>
                    Image{" "}
                    {model === "dall-e-3"
                      ? "generated"
                      : editMode === "multiple"
                      ? "batch edited"
                      : mainImage
                      ? maskImage
                        ? "inpainted"
                        : "edited"
                      : "generated"}{" "}
                    successfully! You can download{" "}
                    {showEditControls ? "or make further adjustments" : ""}.
                  </AlertDescription>
                </Alert>
                <div className="flex space-x-2 w-full">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={handleDownload}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  {showEditControls && editMode !== "multiple" && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        if (resultImage) {
                          fetch(resultImage)
                            .then((res) => res.blob())
                            .then((blob) => {
                              const file = new File(
                                [blob],
                                "result-image.png",
                                {
                                  type: "image/png",
                                }
                              );
                              setMainImage({
                                file,
                                preview: resultImage,
                              });
                              setMaskImage(null);
                              setEditMode("single");
                              setActiveTab("upload");
                            });
                        }
                      }}
                    >
                      <PenLine className="mr-2 h-4 w-4" />
                      Edit Result
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Image collection grid */}
            {imageCollection?.length > 0 && (
              <div className="w-full mt-4">
                <Label className="block mb-2">Image History</Label>
                <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-64">
                  {imageCollection?.map((image, index) => (
                    <div
                      key={image.id}
                      className={`relative rounded-md overflow-hidden bg-muted cursor-pointer border-2 ${
                        selectedImageIndex === index
                          ? "border-primary"
                          : "border-transparent"
                      }`}
                      onClick={() => selectImageForEditing(index)}
                    >
                      <img
                        src={image.url}
                        alt={`${image.type} image ${index + 1}`}
                        className="w-full h-20 object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-70 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromCollection(index);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <div className="absolute bottom-0 left-0 right-0 bg-background/70 text-xs p-1 text-center truncate">
                        {image.type} #{index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Add global CSS for checkerboard pattern */}
      <style jsx global>{`
        .bg-checkerboard {
          background-image: linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
            linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
            linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }
      `}</style>
    </div>
  );
}

export default GenerateImagePage;
