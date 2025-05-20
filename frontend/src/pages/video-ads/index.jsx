import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { promptGenerating } from "@/services/picture-ads";
import { PROMPT_GENERATE_DESCRIPTION, PROMPT_SCRIPT } from "./constant";
import ScriptGenerated from "./script-generated";
import { Textarea } from "@/components/ui/textarea";

const VideoAds = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scriptGenerated, setScriptGenerated] = useState(null);
  const [description, setDescription] = useState("");
  const [descriptionGenerated, setDescriptionGenerated] = useState("");

  // Handle file drop
  const onDrop = useCallback((acceptedFiles) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
      handleUpload(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    maxFiles: 1,
  });

  const handleUpload = async (uploadFile) => {
    if (!uploadFile) return;

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("images", uploadFile);
      formData.append("model", "o3-2025-04-16");

      const promptToUse = description.trim()
        ? description
        : PROMPT_GENERATE_DESCRIPTION;

      formData.append("prompt", promptToUse);

      const result = await promptGenerating(formData);
      setDescriptionGenerated(result?.content);
      toast.success("Generate script successfully!");
      return result;
    } catch (error) {
      error && toast.error("Something went wrong! Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview(null);
    setScriptGenerated(null);
  };

  // Handle description change
  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
  };

  const handleGenerateScript = async () => {
    if (!file) {
      toast.error("Please upload an image first");
      return;
    }

    try {
      setLoading(true);
      const prompt = PROMPT_SCRIPT.replace(
        "{description}",
        descriptionGenerated
      );
      const formData = new FormData();
      formData.append("images", file);
      formData.append("model", "o3-2025-04-16");
      formData.append("prompt", prompt);

      const result = await promptGenerating(formData);
      setScriptGenerated(result?.content);
      toast.success("Generate script successfully!");
    } catch (error) {
      error && toast.error("Something went wrong! Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="grid grid-cols-1 gap-6">
        {/* Upload Section */}
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Image</h2>
            <p className="text-sm text-gray-500 mt-1">
              Upload an image to create a video ad script. Supported formats:
              JPG, PNG, GIF, WEBP.
            </p>
          </div>

          <div className="mb-4">
            <label
              htmlFor="description"
              className="block text-sm font-medium mb-1"
            >
              Description (Optional)
            </label>
            <Textarea
              id="description"
              placeholder="Enter custom prompt or leave empty for auto product analysis"
              value={description}
              onChange={handleDescriptionChange}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to automatically analyze product and generate
              description
            </p>
          </div>

          {!preview ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors h-64 flex flex-col items-center justify-center
                ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-gray-300 hover:border-primary/50"
                }`}
            >
              <input {...getInputProps()} />
              <UploadCloud className="h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm font-medium">
                {isDragActive
                  ? "Drop the image here..."
                  : "Drag & drop an image here, or click to select"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Support: JPG, PNG, GIF, WEBP
              </p>
            </div>
          ) : (
            <div className="relative">
              <div className="relative rounded-lg overflow-hidden h-64 flex items-center justify-center bg-gray-100">
                <img
                  src={preview}
                  alt="Preview"
                  className="h-full object-contain"
                />
                {loading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                      <p className="mt-2 text-sm">Processing...</p>
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-md"
                onClick={handleRemoveFile}
                disabled={loading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {preview && !loading && (
            <div className="mt-4">
              <Button
                className="w-full"
                disabled={loading}
                onClick={() => handleUpload(file)}
              >
                Regenerate script
              </Button>
            </div>
          )}
        </Card>
      </div>
      {descriptionGenerated && (
        <div className="p-4">
          <pre className="bg-gray-50 p-4 rounded-md overflow-auto text-sm">
            {descriptionGenerated}
          </pre>
          <Button
            className="w-full"
            disabled={loading}
            onClick={handleGenerateScript}
          >
            Generate script
          </Button>
        </div>
      )}

      {scriptGenerated && (
        <div className="mt-2">
          <ScriptGenerated scriptGenerated={scriptGenerated} />
        </div>
      )}
    </div>
  );
};

export default VideoAds;
