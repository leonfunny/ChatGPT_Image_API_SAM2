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
  Edit,
  AlertTriangle,
  Clock,
  CheckCircle2,
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
  const [promptHistory, setPromptHistory] = useState([]);
  const [activeView, setActiveView] = useState("images");

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
  };

  useEffect(() => {
    setImageSize("1024x1024");
    setQuality("auto");
    setError(null);
  }, [model]);

  const addToCollection = (imageUrl, imageType = "generated") => {
    const newImage = {
      id: Date.now(),
      url: imageUrl,
      type: imageType,
      createdAt: new Date(),
      prompt: prompt,
    };
    setImageCollection((prev) => [...prev, newImage]);

    if (prompt.trim() && !promptHistory.some((item) => item.text === prompt)) {
      setPromptHistory((prev) => [
        {
          id: Date.now(),
          text: prompt,
          model: model,
          size: imageSize,
          quality: quality,
          timestamp: new Date(),
        },
        ...prev,
      ]);
    }
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

  const selectHistoryPrompt = (historyItem) => {
    setPrompt(historyItem.text);

    if (historyItem.model && modelOptions[historyItem.model]) {
      setModel(historyItem.model);
    }

    if (historyItem.size) {
      setImageSize(historyItem.size);
    }

    if (historyItem.quality) {
      setQuality(historyItem.quality);
    }
  };

  const removePromptFromHistory = (e, promptId) => {
    e.stopPropagation();
    setPromptHistory((prev) => prev.filter((item) => item.id !== promptId));
  };

  const clearPromptHistory = () => {
    setPromptHistory([]);
  };

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
      formData.append("quality", editData.quality);

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
      if (response && response.image_url) {
        addToCollection(response.image_url, "batch-edited");
        setResultImage(response.image_url);
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

    if (editMode === "multiple" && uploadedImages.length > 0) {
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
        quality: quality,
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
      try {
        let fileName = "generated-image-" + Date.now() + ".png";
        const urlParts = resultImage.split("/");
        if (urlParts.length > 0) {
          const lastPart = urlParts[urlParts.length - 1];
          if (lastPart.includes(".")) {
            fileName = lastPart;
          }
        }

        const link = document.createElement("a");
        link.href = resultImage;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        setError("Failed to download the image: " + error.message);
      }
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
          {editMode === "multiple"
            ? "Editing Image References..."
            : mainImage
            ? maskImage
              ? "Editing with Mask..."
              : "Editing..."
            : "Generating..."}
        </>
      );
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

  // Format timestamp cho lịch sử prompt
  const formatTimestamp = (date) => {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="px-4 max-w-full">
      <h1 className="text-3xl font-bold tracking-tight mb-6">
        Image{" "}
        {editMode === "multiple"
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
                Describe what you want to generate and provide reference images
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Edit Mode Selector */}
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
                  <Select value={model} onValueChange={setModel} disabled>
                    <SelectTrigger id="model">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-image-1">GPT Image 1</SelectItem>
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

              <Separator />

              {/* Conditional render based on edit mode */}
              {editMode === "multiple" ? (
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
              )}
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                onClick={handleGenerateImage}
                disabled={
                  isLoading ||
                  !prompt ||
                  (editMode === "single" && mainImage && !mainImage.file) ||
                  (editMode === "multiple" && uploadedImages.length === 0)
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
              {editMode === "multiple"
                ? "New Image Edited"
                : mainImage
                ? "Edited"
                : "Generated"}{" "}
              Result
            </CardTitle>
            <CardDescription>
              Your image will appear here after{" "}
              {editMode === "multiple"
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
                    {editMode === "multiple"
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
                    {editMode === "multiple"
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
                    {editMode === "multiple"
                      ? "batch edited"
                      : mainImage
                      ? maskImage
                        ? "inpainted"
                        : "edited"
                      : "generated"}{" "}
                    successfully! You can download or make further adjustments.
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
                </div>
              </>
            )}

            {/* Tabs cho History */}
            <div className="w-full mt-4">
              <div className="flex space-x-2 mb-4">
                <Button
                  variant={activeView === "images" ? "default" : "outline"}
                  onClick={() => setActiveView("images")}
                  size="sm"
                  className="flex-1"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Images
                </Button>
                <Button
                  variant={activeView === "prompts" ? "default" : "outline"}
                  onClick={() => setActiveView("prompts")}
                  size="sm"
                  className="flex-1"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Prompts
                </Button>
              </div>

              {/* Image History View */}
              {activeView === "images" && imageCollection.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="block">Image History</Label>
                  </div>
                  <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-64">
                    {imageCollection.map((image, index) => (
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

              {/* Prompt History View */}
              {activeView === "prompts" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="block">Prompt History</Label>
                    {promptHistory.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearPromptHistory}
                        title="Clear all prompt history"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Clear All
                      </Button>
                    )}
                  </div>

                  {promptHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No prompt history yet</p>
                      <p className="text-sm">
                        Your prompt history will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {promptHistory.map((historyItem) => (
                        <div
                          key={historyItem.id}
                          className="p-3 bg-muted rounded-md hover:bg-muted/80 cursor-pointer transition-colors text-sm relative group"
                          onClick={() => selectHistoryPrompt(historyItem)}
                        >
                          <div className="flex justify-between mb-1">
                            <span className="text-xs text-muted-foreground">
                              {historyItem.timestamp
                                ? formatTimestamp(historyItem.timestamp)
                                : ""}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) =>
                                removePromptFromHistory(e, historyItem.id)
                              }
                              title="Remove from history"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>

                          <p className="line-clamp-2">{historyItem.text}</p>

                          {(historyItem.size || historyItem.quality) && (
                            <div className="flex mt-2 text-xs text-muted-foreground">
                              {historyItem.size && (
                                <span className="mr-2 flex items-center">
                                  <span className="bg-muted-foreground/20 rounded px-1.5 py-0.5">
                                    {historyItem.size}
                                  </span>
                                </span>
                              )}

                              {historyItem.quality && (
                                <span className="flex items-center">
                                  <span className="bg-muted-foreground/20 rounded px-1.5 py-0.5">
                                    Quality: {historyItem.quality}
                                  </span>
                                </span>
                              )}
                            </div>
                          )}

                          <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default GenerateImagePage;
