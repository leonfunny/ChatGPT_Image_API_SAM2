/* eslint-disable react/no-unknown-property */
import React, { useState } from "react";
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
import axios from "axios";
import SingleImageUpload from "./single-upload";
import MultipleImageUpload from "./multiple-upload";

function GenerateImagePage() {
  const [prompt, setPrompt] = useState("");
  const [mainImage, setMainImage] = useState(null);
  const [maskImage, setMaskImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [activeTab, setActiveTab] = useState("upload");

  // State for error handling
  const [error, setError] = useState(null);

  // State for model options
  const [model, setModel] = useState("gpt-image-1");
  const [imageSize, setImageSize] = useState("1024x1024");
  const [quality, setQuality] = useState("auto");

  // State for multiple image support
  const [uploadedImages, setUploadedImages] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [editMode, setEditMode] = useState("single"); // "single" or "multiple"

  // State for image collection (history)
  const [imageCollection, setImageCollection] = useState([]);

  // Track the progress for batch editing
  const [batchProgress, setBatchProgress] = useState({
    total: 0,
    completed: 0,
    inProgress: false,
  });

  // Functions for managing the image collection
  const addToCollection = (imageUrl, imageType = "generated") => {
    const newImage = {
      id: Date.now(), // Unique ID
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
    const selectedImage = imageCollection[index];

    // Convert data URL to File object for editing
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
        // Clear mask if any
        setMaskImage(null);
        // Set the selected index
        setSelectedImageIndex(index);
        // Set the edit mode to single
        setEditMode("single");
        // Navigate to the upload tab
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

    // Also clear the mask image since it depends on the main image
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
      // Revoke object URL to prevent memory leaks
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  // TanStack Query mutation for image generation
  const generateMutation = useMutation({
    mutationFn: (imageData) => {
      // Clear any previous errors
      setError(null);

      return axios.post("http://localhost:8000/api/v1/generate", imageData, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: (response) => {
      // Handle the API response based on the actual structure
      if (response.data && response.data.image_data) {
        const format = response.data.format || "png";
        const imageUrl = `data:image/${format};base64,${response.data.image_data}`;
        setResultImage(imageUrl);

        // Add to collection
        addToCollection(imageUrl, "generated");
      }
    },
    onError: (error) => {
      setError(
        error.response?.data?.detail ||
          "Some thing went wrong. Please try again."
      );
    },
  });

  // TanStack Query mutation for image editing (single image)
  const editMutation = useMutation({
    mutationFn: async (editData) => {
      // Clear any previous errors
      setError(null);

      // Create a FormData object for file uploads
      const formData = new FormData();

      // Add basic fields
      formData.append("prompt", editData.prompt);
      formData.append("model", editData.model);
      formData.append("size", editData.size);
      formData.append("output_format", editData.output_format);

      if (editData.output_compression !== null) {
        formData.append("output_compression", editData.output_compression);
      }

      // Add the main image file
      formData.append("image", editData.image);

      // Add mask image if provided
      if (editData.mask) {
        formData.append("mask", editData.mask);
      }

      // Make the API call
      return axios.post(
        "http://localhost:8000/api/v1/generate/edit",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
    },
    onSuccess: (response) => {
      if (response.data && response.data.image_data) {
        const format = response.data.format || "png";
        const imageUrl = `data:image/${format};base64,${response.data.image_data}`;
        setResultImage(imageUrl);

        // Add to collection
        addToCollection(imageUrl, "edited");
      }
    },
    onError: (error) => {
      setError(
        error.response?.data?.detail ||
          "Some thing went wrong. Please try again."
      );
    },
  });

  // TanStack Query mutation for batch image editing (multiple images)
  const batchEditMutation = useMutation({
    mutationFn: async (batchData) => {
      // Clear any previous errors
      setError(null);

      // Create a FormData object for file uploads
      const formData = new FormData();

      // Add basic fields
      formData.append("prompt", batchData.prompt);
      formData.append("model", batchData.model);
      formData.append("size", batchData.size);
      formData.append("output_format", batchData.output_format);

      if (batchData.output_compression !== null) {
        formData.append("output_compression", batchData.output_compression);
      }

      // Add multiple images
      batchData.images.forEach((image) => {
        formData.append("images", image);
      });

      // Call the batch edit endpoint
      return axios.post(
        "http://localhost:8000/api/v1/generate/batch-edit",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
    },
    onSuccess: (response) => {
      // Process the array of edited images
      if (
        response.data &&
        response.data.results &&
        response.data.results.length > 0
      ) {
        const results = response.data.results;

        // Add all results to the collection
        results.forEach((result) => {
          const format = result.format || "png";
          const imageUrl = `data:image/${format};base64,${result.image_data}`;
          addToCollection(imageUrl, "batch-edited");
        });

        // Set the last result as the current result image
        if (results.length > 0) {
          const lastResult = results[results.length - 1];
          const format = lastResult.format || "png";
          const imageUrl = `data:image/${format};base64,${lastResult.image_data}`;
          setResultImage(imageUrl);
        }

        // Update progress status
        setBatchProgress((prev) => ({
          ...prev,
          inProgress: false,
        }));
      }
    },
    onError: (error) => {
      setError(
        error.response?.data?.detail ||
          "Some thing went wrong. Please try again."
      );
    },
  });

  const handleGenerateImage = () => {
    // Clear any existing errors before making a new request
    setError(null);

    if (editMode === "multiple" && uploadedImages.length > 0) {
      // We're batch editing multiple images
      const batchData = {
        prompt: prompt,
        model: model,
        size: imageSize,
        output_format: "png",
        output_compression: 0,
        images: uploadedImages.map((img) => img.file),
      };

      // Call the batch edit mutation
      batchEditMutation.mutate(batchData);
    } else if (mainImage) {
      // We're editing a single image
      const editData = {
        prompt: prompt,
        model: model,
        size: imageSize,
        output_format: "png",
        output_compression: 0,
        image: mainImage.file,
      };

      // Add mask if available
      if (maskImage) {
        editData.mask = maskImage.file;
      }

      // Call the edit mutation
      editMutation.mutate(editData);
    } else {
      // We're generating a new image from scratch
      const requestData = {
        prompt: prompt,
        model: model,
        size: imageSize,
        quality: quality,
        background: "auto",
        output_format: "png",
        output_compression: 0,
      };

      // Call the generate mutation
      generateMutation.mutate(requestData);
    }
  };

  const handleDownload = () => {
    if (resultImage) {
      const link = document.createElement("a");
      link.href = resultImage;
      link.download = "generated-image.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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

  // Check if any mutation is in a loading state
  const isLoading =
    generateMutation.isPending ||
    editMutation.isPending ||
    batchEditMutation.isPending;

  // Override the handleGenerateImage function to track batch progress
  const handleGenerateImageWithProgress = () => {
    if (editMode === "multiple" && uploadedImages.length > 0) {
      // Set initial progress for batch editing
      setBatchProgress({
        total: uploadedImages.length,
        completed: 0,
        inProgress: true,
      });

      // We're batch editing multiple images
      const batchData = {
        prompt: prompt,
        model: model,
        size: imageSize,
        output_format: "png",
        output_compression: 0,
        images: uploadedImages.map((img) => img.file),
        // Add callbacks for progress tracking
        onImageProcessed: () => {
          setBatchProgress((prev) => ({
            ...prev,
            completed: prev.completed + 1,
          }));
        },
      };

      // Call the batch edit mutation
      batchEditMutation.mutate(batchData, {
        onSuccess: () => {
          setBatchProgress((prev) => ({
            ...prev,
            inProgress: false,
          }));
        },
        onError: () => {
          setBatchProgress((prev) => ({
            ...prev,
            inProgress: false,
          }));
        },
      });
    } else {
      // Call the original function for single image generation/editing
      handleGenerateImage();
    }
  };

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-3xl font-bold tracking-tight mb-6">
        Image{" "}
        {editMode === "multiple"
          ? "Image References"
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
                      // Clear the uploaded images if switching to single mode
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
                      // Clear the main image and mask if switching to multiple mode
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
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger id="model">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-image-1">GPT Image 1</SelectItem>
                      {editMode !== "multiple" && (
                        <>
                          <SelectItem value="dall-e-2">Dall-E 2</SelectItem>
                          <SelectItem value="dall-e-3">Dall-E 3</SelectItem>
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
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="auto">Auto (Default)</SelectItem>
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
                      <SelectItem value="1024x1024">
                        <div className="flex items-center gap-2">
                          <Square className="h-4 w-4" />
                          <span>Square (1024×1024)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="1536x1024">
                        <div className="flex items-center gap-2">
                          <RectangleHorizontal className="h-4 w-4" />
                          <span>Landscape (1536×1024)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="1024x1536">
                        <div className="flex items-center gap-2">
                          <SquareUser className="h-4 w-4" />
                          <span>Portrait (1024×1536)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="auto">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          <span>Auto (Default)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Conditional render based on edit mode */}
              {editMode === "multiple" ? (
                // Multiple Images Upload Component
                <MultipleImageUpload
                  uploadedImages={uploadedImages}
                  onImageUpload={handleMultipleImageUpload}
                  onImageRemove={removeUploadedImage}
                />
              ) : (
                // Single Image Upload Component
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
                onClick={handleGenerateImageWithProgress}
                disabled={
                  isLoading ||
                  !prompt ||
                  (editMode === "single" && mainImage && !mainImage.file) ||
                  (editMode === "multiple" && uploadedImages.length === 0)
                }
              >
                {getButtonText()}
              </Button>

              {/* Progress indicator for batch processing */}
              {batchProgress.inProgress && (
                <div className="mt-3 w-full">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>
                      Processing images ({batchProgress.completed}/
                      {batchProgress.total})
                    </span>
                    <span>
                      {Math.round(
                        (batchProgress.completed / batchProgress.total) * 100
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-300"
                      style={{
                        width: `${
                          (batchProgress.completed / batchProgress.total) * 100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}
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
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      // Save the current result as the main image for further editing
                      if (resultImage) {
                        // Convert data URL to File object
                        fetch(resultImage)
                          .then((res) => res.blob())
                          .then((blob) => {
                            const file = new File([blob], "result-image.png", {
                              type: "image/png",
                            });
                            setMainImage({
                              file,
                              preview: resultImage,
                            });
                            // Clear mask if any
                            setMaskImage(null);
                            // Switch to single mode
                            setEditMode("single");
                            // Navigate to the upload tab
                            setActiveTab("upload");
                          });
                      }
                    }}
                  >
                    <PenLine className="mr-2 h-4 w-4" />
                    Edit Result
                  </Button>
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
