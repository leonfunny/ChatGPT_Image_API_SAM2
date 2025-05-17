import React, { useState, useCallback, useEffect } from "react";
import { Upload, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { modelOptions, templateString, autoPrompt } from "@/utils/constants";
import IdeaCard from "./idea-card";
import ImageGenerateResult from "./image-generate";
import GeneratePromptStep from "./generate-prompt";
import { promptGenerating } from "@/services/picture-ads";
import { editImage, editMergeImage } from "@/services/picture-ads";
import { extractJsonFromContent } from "@/utils/functions";
import { toast } from "sonner";

const PictureAdsTab = () => {
  const model = "gpt-image-1";

  const [currentStep, setCurrentStep] = useState(1);
  const [promptInput, setPromptInput] = useState("");
  const [images, setImages] = useState([]);
  const [language, setLanguage] = useState("polish");
  const [processing, setProcessing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [generatedBanners, setGeneratedBanners] = useState([]);
  const [quality, setQuality] = useState("medium");
  const [imageSize, setImageSize] = useState("1024x1536");

  const goToNextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 2)); // Giới hạn chỉ có 2 step
  };

  const goToPreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const canProceedToGeneration = result && images.length > 0;

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (images.length + acceptedFiles.length > 6) {
        toast.error("You can upload maximum 6 images");
        const allowedFiles = acceptedFiles.slice(0, 6 - images.length);
        const newImages = allowedFiles.map((file) => {
          const fileWithId = Object.assign(file, {
            id: `image-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            preview: URL.createObjectURL(file),
          });
          return fileWithId;
        });
        setImages([...images, ...newImages]);
      } else {
        const newImages = acceptedFiles.map((file) => {
          const fileWithId = Object.assign(file, {
            id: `image-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            preview: URL.createObjectURL(file),
          });
          return fileWithId;
        });
        setImages([...images, ...newImages]);
      }
    },
    [images]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif"],
    },
  });

  const removeImage = (idToRemove) => {
    const imageToRemove = images.find((img) => img.id === idToRemove);
    if (imageToRemove) {
      if (imageToRemove.preview) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      setImages(images.filter((img) => img.id !== idToRemove));
    }
  };

  const generateIdeasWithPrompt = async (promptText) => {
    if (!promptText.trim()) {
      toast.error("No valid prompt to generate ideas");
      setProcessing(false);
      return;
    }

    try {
      const prompt = templateString
        .replace("{prompt input}", promptText)
        .replace("{language}", language);

      const formData = new FormData();
      formData.append("prompt", prompt);

      if (images.length > 0) {
        images.forEach((img) => {
          formData.append("images", img);
        });
      }

      const responseData = await promptGenerating(formData);

      if (responseData && responseData.content) {
        const extractedData = extractJsonFromContent(responseData.content);
        if (extractedData) {
          setResult(extractedData);
          setCurrentStep(2);
          toast.success("Generated ideas from product description");
        } else {
          throw new Error(
            "AI not generated JSON from response content. Please try again."
          );
        }
      } else {
        throw new Error("Invalid response format from API");
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
      toast.error("Failed to generate ideas");
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessPrompt = async () => {
    if (!promptInput.trim() && images.length === 0) {
      toast.error("Please enter a prompt or upload images");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      if (promptInput.trim()) {
        await generateIdeasWithPrompt(promptInput);
      } else if (images.length > 0) {
        const formData = new FormData();
        formData.append("prompt", autoPrompt);

        images.forEach((img) => {
          formData.append("images", img);
        });

        const responseData = await promptGenerating(formData);

        if (responseData && responseData.content) {
          let extractedDescription = "";

          try {
            const jsonResponse = JSON.parse(responseData.content);
            if (jsonResponse.description) {
              extractedDescription = jsonResponse.description;
            } else {
              extractedDescription = responseData.content
                .replace(/```json|```/g, "")
                .trim();
            }
          } catch (e) {
            extractedDescription = responseData.content
              .replace(/```json|```/g, "")
              .trim();
          }

          setPromptInput(extractedDescription);

          await generateIdeasWithPrompt(extractedDescription);
        } else {
          throw new Error("Invalid response format from API");
        }
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
      toast.error("Failed to generate ideas");
      setProcessing(false);
    }
  };

  const processImageWithAllIdeas = async () => {
    if (!result || Object.keys(result).length === 0) {
      toast.error("Please generate ideas first");
      return;
    }

    if (images.length === 0) {
      toast.error("Invalid image selection");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const promises = Object.entries(result).map(async ([title, details]) => {
        const idea = {
          title: title,
          details: details,
        };

        const formData = new FormData();
        formData.append(
          "prompt",
          `create me banner from attached images with idea: ${JSON.stringify(
            idea
          )}`
        );
        formData.append("model", model);
        formData.append("quality", quality);
        formData.append("size", imageSize);

        if (images.length > 1) {
          images.forEach((img) => {
            formData.append("images", img);
          });

          const response = await editMergeImage(formData);
          return {
            response: response,
            ideaTitle: title,
          };
        } else {
          formData.append("image", images[0]);
          const response = await editImage(formData);
          return {
            response: response,
            ideaTitle: title,
          };
        }
      });

      const results = await Promise.all(promises);
      const newBanners = results.map((result) => ({
        id: Date.now() + Math.random(),
        imageUrl: result.response.image_url,
        idea: result.ideaTitle,
        timestamp: new Date().toISOString(),
      }));

      setGeneratedBanners((prev) => [...prev, ...newBanners]);
      toast.success("Banners generated successfully!");
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
      toast.error("Failed to generate banners");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.preview) URL.revokeObjectURL(img.preview);
      });
    };
  }, [images]);

  const updateIdea = (index, newTitle, newDetails) => {
    if (result) {
      const resultEntries = Object.entries(result);
      resultEntries[index] = [newTitle, newDetails];
      const updatedResult = Object.fromEntries(resultEntries);
      setResult(updatedResult);
    }
  };

  return (
    <div className="w-full space-y-6 p-4 max-w-6xl mx-auto">
      {/* Workflow Progress Indicator - Chỉ hiển thị 2 steps */}
      <div className="w-full mb-8">
        <div className="flex items-center justify-between">
          <div
            className={`flex flex-col items-center ${
              currentStep >= 1 ? "text-primary" : "text-gray-400"
            }`}
            onClick={() => currentStep > 1 && setCurrentStep(1)}
          >
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${
                currentStep >= 1
                  ? "border-primary bg-primary/10"
                  : "border-gray-200"
              }`}
            >
              <span className="font-bold">1</span>
            </div>
            <span className="mt-2 text-sm font-medium">Product Info</span>
          </div>

          <div
            className={`flex-1 h-1 mx-2 ${
              currentStep >= 2 ? "bg-primary" : "bg-gray-200"
            }`}
          ></div>

          <div
            className={`flex flex-col items-center ${
              currentStep >= 2 ? "text-primary" : "text-gray-400"
            }`}
            onClick={() => canProceedToGeneration && setCurrentStep(2)}
          >
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${
                currentStep >= 2
                  ? "border-primary bg-primary/10"
                  : "border-gray-200"
              }`}
            >
              <span className="font-bold">2</span>
            </div>
            <span className="mt-2 text-sm font-medium">
              Creative Ideas & Generate
            </span>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-medium text-center mb-2">
        Upload Product Images
      </h3>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/10"
            : "border-gray-300 hover:border-primary"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2">
          <Upload className="h-8 w-8 text-gray-400" />
          <p className="font-medium">
            {isDragActive
              ? "Drop images here..."
              : "Drag and drop images here, or click to select files"}
          </p>
          <p className="text-xs text-gray-500">
            Supports JPG, PNG, GIF (Max 6 images)
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {images.length > 0 && (
          <div className="mt-4">
            <Label className="text-base font-medium">
              Upload Images ({images.length})
            </Label>
            <div className="flex flex-wrap gap-3 mt-3">
              {images.map((file, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square w-24 rounded-md overflow-hidden bg-gray-100 border">
                    <img
                      src={file.preview}
                      alt={`Reference image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => removeImage(file.id)}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Step 1: Product Information */}
      {currentStep === 1 && (
        <GeneratePromptStep
          promptInput={promptInput}
          setPromptInput={setPromptInput}
          language={language}
          setLanguage={setLanguage}
          onContinue={handleProcessPrompt}
          processing={processing}
          images={images}
        />
      )}

      {/* Step 2: Creative Ideas Selection và Generate luôn */}
      {currentStep === 2 && (
        <Card className="border-2 border-primary/70">
          <CardHeader>
            <CardTitle>Step 2: Creative Ideas & Generate</CardTitle>
            <CardDescription>
              Review your ad ideas and generate banners
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {processing && (
              <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <span className="ml-3 text-lg">
                  Generating creative ideas...
                </span>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-100 text-red-700 rounded-md">
                <p className="font-medium">Error occurred:</p>
                <p>{error}</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(result).map(([title, details], index) => (
                    <IdeaCard
                      key={index}
                      title={title}
                      details={details}
                      onUpdate={(_, newTitle, newDetails) =>
                        updateIdea(index, newTitle, newDetails)
                      }
                      index={index}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 bg-gray-50 p-4 rounded-md">
              <h3 className="text-lg font-medium mb-3">Image Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="quality" className="text-base font-medium">
                    Image Quality
                  </Label>
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
                  <Label htmlFor="image-size" className="text-base font-medium">
                    Banner Size
                  </Label>
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

              {/* Generate Button ngay trong step 2 */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={processImageWithAllIdeas}
                  disabled={generating || !canProceedToGeneration}
                  className="text-white"
                >
                  {generating ? "Processing..." : "Generate Banners"}
                </Button>
              </div>
            </div>

            {generating && (
              <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <span className="ml-3 text-lg">Generating banners...</span>
              </div>
            )}

            {/* Hiển thị kết quả ngay trong step 2 */}
            {generatedBanners.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Generated Banners</h3>
                <ImageGenerateResult
                  generatedBanners={generatedBanners}
                  promptInput={promptInput}
                  language={language}
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-start">
            <Button
              variant="outline"
              onClick={goToPreviousStep}
              disabled={generating}
            >
              Back to Description
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default PictureAdsTab;
