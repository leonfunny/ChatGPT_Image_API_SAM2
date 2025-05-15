import React, { useState, useCallback } from "react";
import { Upload, X, ArrowRight } from "lucide-react";
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
import { languages, modelOptions, templateString } from "@/utils/constants";
import IdeaCard from "./idea-card";
import ImageGenerateResult from "./image-generate";
import GeneratePromptStep from "./generate-prompt";
import { promptGenerating } from "@/services/picture-ads";
import { editImage } from "@/services/picture-ads";
import { extractJsonFromContent } from "@/utils/functions";

const PictureAdsTab = () => {
  const model = "gpt-image-1";

  const [currentStep, setCurrentStep] = useState(1);
  const [promptInput, setPromptInput] = useState("");
  const [language, setLanguage] = useState("polish");
  const [uploadedImages, setUploadedImages] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [generatedBanners, setGeneratedBanners] = useState([]);
  const [quality, setQuality] = useState("auto");
  const [imageSize, setImageSize] = useState("auto");

  const goToNextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const goToPreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const canProceedToGeneration = result && uploadedImages.length > 0;

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (uploadedImages.length + acceptedFiles.length > 6) {
        alert("You can upload maximum 6 images");
        const allowedFiles = acceptedFiles.slice(0, 6 - uploadedImages.length);
        const newImages = allowedFiles.map((file) =>
          Object.assign(file, {
            preview: URL.createObjectURL(file),
          })
        );
        setUploadedImages([...uploadedImages, ...newImages]);
      } else {
        const newImages = acceptedFiles.map((file) =>
          Object.assign(file, {
            preview: URL.createObjectURL(file),
          })
        );
        setUploadedImages([...uploadedImages, ...newImages]);
      }
    },
    [uploadedImages]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif"],
    },
  });

  const removeImage = (index) => {
    const newImages = [...uploadedImages];
    URL.revokeObjectURL(newImages[index].preview);
    newImages.splice(index, 1);
    setUploadedImages(newImages);
  };

  const handleProcessPrompt = async () => {
    if (!promptInput.trim()) {
      alert("Please enter a prompt");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const prompt = templateString
        .replace("{prompt input}", promptInput)
        .replace("{language}", language);

      const responseData = await promptGenerating(JSON.stringify({ prompt }));

      if (responseData && responseData.content) {
        const extractedData = extractJsonFromContent(responseData.content);
        setCurrentStep(2);
        if (extractedData) {
          setResult(extractedData);
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
    } finally {
      setProcessing(false);
    }
  };

  const processImageWithAllIdeas = async () => {
    if (!result || Object.keys(result).length === 0) {
      alert("Please generate ideas first");
      return;
    }

    const selectedImage = uploadedImages[0];
    if (!selectedImage) {
      alert("Invalid image selection");
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
        formData.append("image", selectedImage);
        formData.append(
          "prompt",
          `create me banner from attached image with idea: ${JSON.stringify(
            idea
          )}`
        );
        formData.append("model", model);
        formData.append("quality", quality);
        formData.append("size", imageSize);

        const response = await editImage(formData);

        return {
          response: response,
          ideaTitle: title,
        };
      });

      const results = await Promise.all(promises);
      const newBanners = results.map((result) => ({
        id: Date.now() + Math.random(),
        imageUrl: result.response.image_url,
        idea: result.ideaTitle,
        timestamp: new Date().toISOString(),
      }));

      setGeneratedBanners((prev) => [...prev, ...newBanners]);
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="w-full space-y-6 p-4 max-w-6xl mx-auto">
      {/* Workflow Progress Indicator */}
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
            onClick={() => setCurrentStep(2)}
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
            <span className="mt-2 text-sm font-medium">Creative Ideas</span>
          </div>

          <div
            className={`flex-1 h-1 mx-2 ${
              currentStep >= 3 ? "bg-primary" : "bg-gray-200"
            }`}
          ></div>

          <div
            className={`flex flex-col items-center ${
              currentStep >= 3 ? "text-primary" : "text-gray-400"
            }`}
            onClick={() => canProceedToGeneration && setCurrentStep(3)}
          >
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${
                currentStep >= 3
                  ? "border-primary bg-primary/10"
                  : "border-gray-200"
              }`}
            >
              <span className="font-bold">3</span>
            </div>
            <span className="mt-2 text-sm font-medium">Generate Banners</span>
          </div>
        </div>
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
        />
      )}

      {/* Step 2: Creative Ideas Selection */}
      {currentStep === 2 && (
        <Card className="border-2 border-primary/70">
          <CardHeader>
            <CardTitle>Step 2: Upload Image</CardTitle>
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
                    <IdeaCard key={index} title={title} details={details} />
                  ))}
                </div>
              </div>
            )}

            {/* Added Banner Configuration Section */}
            <div className="mt-6 bg-gray-50 p-4 rounded-md">
              <h3 className="text-lg font-medium mb-3">Banner Configuration</h3>
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

              <h3 className="text-lg font-medium mb-2">
                Upload Product Images
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Upload up to 6 product images that will be used for banner
                generation
              </p>

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

              {uploadedImages.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Uploaded Images ({uploadedImages.length}/6)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {uploadedImages.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-md overflow-hidden bg-gray-100 border">
                          <img
                            src={file.preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => removeImage(index)}
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
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={goToPreviousStep}>
              Back to Description
            </Button>
            <Button
              onClick={goToNextStep}
              className="px-8"
              disabled={uploadedImages.length === 0}
            >
              Continue to Banner Generation{" "}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Banner Generation */}
      {currentStep === 3 && (
        <Card className="border-2 border-primary/70">
          <CardHeader>
            <CardTitle>Step 3: Generate Banners</CardTitle>
            <CardDescription>
              Generate banners using idea and images
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-medium mb-2">Configuration</h3>
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">Language:</span>{" "}
                      {languages.find((l) => l.value === language)?.label}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Quality:</span>{" "}
                      {
                        modelOptions[model].qualities.find(
                          (q) => q.value === quality
                        )?.label
                      }
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Size:</span>{" "}
                      {
                        modelOptions[model].sizes.find(
                          (s) => s.value === imageSize
                        )?.label
                      }
                    </p>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-medium mb-2">Images</h3>
                  <p className="text-sm mb-2">
                    {uploadedImages.length} image(s) uploaded
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={processImageWithAllIdeas}
                  disabled={generating}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {generating ? "Processing..." : "Generate All Image"}
                </Button>
              </div>
            </div>

            {generating && (
              <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <span className="ml-3 text-lg">Generating banners...</span>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-100 text-red-700 rounded-md">
                <p className="font-medium">Error occurred:</p>
                <p>{error}</p>
              </div>
            )}

            {generatedBanners.length > 0 && (
              <ImageGenerateResult generatedBanners={generatedBanners} />
            )}
          </CardContent>
          <CardFooter className="flex justify-start">
            <Button
              variant="outline"
              onClick={goToPreviousStep}
              disabled={generating}
            >
              Back to Ideas
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default PictureAdsTab;
