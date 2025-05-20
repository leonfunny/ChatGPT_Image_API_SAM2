/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import {
  Save,
  Edit,
  Copy,
  Check,
  PlusCircle,
  Trash2,
  Film,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { promptGenerating as apiPromptGenerating } from "@/services/picture-ads";
import { generate } from "@/services/generate-image";
import { toast } from "sonner";
import { PROMPT_GENERATE_IMAGE } from "./constant";
import ImageGenerated from "./image-generated";

const ScriptGenerated = ({ scriptGenerated }) => {
  const [shots, setShots] = useState([]);
  const [jsonString, setJsonString] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [editingShot, setEditingShot] = useState(null);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [generatedPrompts, setGeneratedPrompts] = useState([]);
  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [generatingImageStates, setGeneratingImageStates] = useState({});
  const [copiedPromptInfo, setCopiedPromptInfo] = useState({
    index: null,
    type: null,
  });

  useEffect(() => {
    let parsedScript = scriptGenerated;
    if (typeof scriptGenerated === "string") {
      try {
        parsedScript = JSON.parse(scriptGenerated);
      } catch (error) {
        parsedScript = [];
      }
    }

    if (!parsedScript) {
      parsedScript = [];
    }

    if (!Array.isArray(parsedScript)) {
      parsedScript = [];
    }

    const formattedShots = parsedScript.map((shot) => ({
      ...shot,
      uploadedImages: shot.uploadedImages || [],
      selectedImageIndex: shot.selectedImageIndex || 0,
    }));

    setShots(formattedShots);
    setJsonString(JSON.stringify(formattedShots, null, 2));

    setGeneratedPrompts(
      formattedShots.map((shot, index) => ({
        shotIndex: index,
        image_start_prompt: shot.image_start_prompt || "",
        ai_video_prompt: shot.ai_video_prompt || "",
      }))
    );

    setGeneratedImages(formattedShots.map(() => null));
    setGeneratingImageStates({});
  }, [scriptGenerated]);

  const handleJsonChange = (e) => {
    const newJsonString = e.target.value;
    setJsonString(newJsonString);
    const parsedJson = JSON.parse(newJsonString);
    const formattedData = parsedJson.map((shot, index) => ({
      shot: shot.shot || (index + 1).toString(),
      duration: shot.duration || "",
      description: shot.description || "",
      CGI_elements: shot.CGI_elements || [],
      image_start_prompt: shot.image_start_prompt || "",
      ai_video_prompt: shot.ai_video_prompt || "",
      isGenerating: shot.isGenerating || false,
      isGenerated: shot.isGenerated || false,
      generatedImage: shot.generatedImage || null,
      isGeneratingImage: shot.isGeneratingImage || false,
      uploadedImages: shot.uploadedImages || [],
      selectedImageIndex: shot.selectedImageIndex || 0,
    }));
    setShots(formattedData);

    const newGeneratedPrompts = formattedData.map((shot, index) => ({
      shotIndex: index,
      image_start_prompt: shot.image_start_prompt || "",
      ai_video_prompt: shot.ai_video_prompt || "",
    }));
    setGeneratedPrompts(newGeneratedPrompts);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonString);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const copyPrompt = (index, type) => {
    const text =
      type === "image"
        ? shots[index].image_start_prompt
        : shots[index].ai_video_prompt;

    navigator.clipboard.writeText(text);
    setCopiedPromptInfo({ index, type });
    setTimeout(() => setCopiedPromptInfo({ index: null, type: null }), 2000);
  };

  const saveJson = () => {
    try {
      const parsedJson = JSON.parse(jsonString);
      const formattedData = parsedJson.map((shot, index) => ({
        shot: shot.shot || (index + 1).toString(),
        duration: shot.duration || "",
        description: shot.description || "",
        CGI_elements: shot.CGI_elements || [],
        image_start_prompt: shot.image_start_prompt || "",
        ai_video_prompt: shot.ai_video_prompt || "",
        isGenerating: shot.isGenerating || false,
        isGenerated: shot.isGenerated || false,
        generatedImage: shot.generatedImage || null,
        isGeneratingImage: shot.isGeneratingImage || false,
        uploadedImages: shot.uploadedImages || [],
        selectedImageIndex: shot.selectedImageIndex || 0,
      }));
      setShots(formattedData);

      const newGeneratedPrompts = formattedData.map((shot, index) => ({
        shotIndex: index,
        image_start_prompt: shot.image_start_prompt || "",
        ai_video_prompt: shot.ai_video_prompt || "",
      }));
      setGeneratedPrompts(newGeneratedPrompts);

      setIsEditing(false);
    } catch (error) {
      toast.error("Invalid JSON format. Please check your input.");
    }
  };

  const toggleEdit = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      setJsonString(JSON.stringify(shots, null, 2));
    }
  };

  const startEditingShot = (index, shot) => {
    setEditingShot({
      index,
      ...shot,
    });
  };

  const handleShotInputChange = (field, value) => {
    setEditingShot((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCGIElementChange = (index, value) => {
    const updatedElements = [...editingShot.CGI_elements];
    updatedElements[index] = value;
    handleShotInputChange("CGI_elements", updatedElements);
  };

  const addCGIElement = () => {
    const updatedElements = [...(editingShot.CGI_elements || []), ""];
    handleShotInputChange("CGI_elements", updatedElements);
  };

  const removeCGIElement = (index) => {
    const updatedElements = [...editingShot.CGI_elements];
    updatedElements.splice(index, 1);
    handleShotInputChange("CGI_elements", updatedElements);
  };

  const saveShotChanges = () => {
    const newShots = [...shots];
    newShots[editingShot.index] = {
      shot: editingShot.shot,
      duration: editingShot.duration,
      description: editingShot.description,
      CGI_elements: editingShot.CGI_elements || [],
      image_start_prompt: editingShot.image_start_prompt || "",
      ai_video_prompt: editingShot.ai_video_prompt || "",
      isGenerating: editingShot.isGenerating || false,
      isGenerated: editingShot.isGenerated || false,
      generatedImage: editingShot.generatedImage || null,
      isGeneratingImage: editingShot.isGeneratingImage || false,
      uploadedImages: editingShot.uploadedImages || [],
      selectedImageIndex: editingShot.selectedImageIndex || 0,
    };

    setShots(newShots);
    setJsonString(JSON.stringify(newShots, null, 2));

    const updatedGeneratedPrompts = [...generatedPrompts];
    const promptIndex = updatedGeneratedPrompts.findIndex(
      (p) => p.shotIndex === editingShot.index
    );

    if (promptIndex !== -1) {
      updatedGeneratedPrompts[promptIndex] = {
        shotIndex: editingShot.index,
        image_start_prompt: editingShot.image_start_prompt || "",
        ai_video_prompt: editingShot.ai_video_prompt || "",
      };
    } else {
      updatedGeneratedPrompts.push({
        shotIndex: editingShot.index,
        image_start_prompt: editingShot.image_start_prompt || "",
        ai_video_prompt: editingShot.ai_video_prompt || "",
      });
    }

    setGeneratedPrompts(updatedGeneratedPrompts);
    setEditingShot(null);
    toast.success("Shot updated successfully!");
  };

  const cancelShotEdit = () => {
    setEditingShot(null);
  };

  const addNewShot = () => {
    const newShot = {
      shot: (shots.length + 1).toString(),
      duration: "",
      description: "",
      CGI_elements: [],
      image_start_prompt: "",
      ai_video_prompt: "",
      isGenerating: false,
      isGenerated: false,
      generatedImage: null,
      isGeneratingImage: false,
      uploadedImages: [],
      selectedImageIndex: 0,
    };

    const newShots = [...shots, newShot];
    setShots(newShots);
    setJsonString(JSON.stringify(newShots, null, 2));

    const updatedGeneratedPrompts = [
      ...generatedPrompts,
      {
        shotIndex: newShots.length - 1,
        image_start_prompt: "",
        ai_video_prompt: "",
      },
    ];
    setGeneratedPrompts(updatedGeneratedPrompts);
    startEditingShot(newShots.length - 1, newShot);
  };

  const deleteShot = (indexToDelete) => {
    if (confirm("Are you sure you want to delete this shot?")) {
      const newShots = shots.filter((_, index) => index !== indexToDelete);

      const updatedShots = newShots.map((shot, index) => ({
        ...shot,
        shot: (index + 1).toString(),
      }));

      setShots(updatedShots);
      setJsonString(JSON.stringify(updatedShots, null, 2));

      let updatedGeneratedPrompts = generatedPrompts.filter(
        (prompt) => prompt.shotIndex !== indexToDelete
      );
      updatedGeneratedPrompts = updatedGeneratedPrompts.map((prompt) => ({
        ...prompt,
        shotIndex:
          prompt.shotIndex > indexToDelete
            ? prompt.shotIndex - 1
            : prompt.shotIndex,
      }));

      setGeneratedPrompts(updatedGeneratedPrompts);

      if (editingShot && editingShot.index === indexToDelete) {
        setEditingShot(null);
      }

      toast.success("Shot deleted successfully!");
    }
  };

  const generatePromptsForAllShots = async () => {
    if (shots.length === 0) return;

    setIsGeneratingPrompts(true);

    try {
      const updatedShots = shots.map((shot) => ({
        ...shot,
        isGenerating: true,
      }));
      setShots(updatedShots);

      const promptPromises = updatedShots.map(async (shot, index) => {
        const promptTemplate = PROMPT_GENERATE_IMAGE.replace(
          "{shot}",
          JSON.stringify(shot, null, 2)
        );

        const formData = new FormData();
        formData.append("prompt", promptTemplate);
        formData.append("model", "gpt-4.1");

        const result = await apiPromptGenerating(formData);

        if (result) {
          let responseData = JSON.parse(result.content);

          if (responseData && responseData.image_prompt) {
            return {
              index,
              success: true,
              prompt: responseData.image_prompt,
            };
          }
        }
        return { index, success: false };
      });

      const results = await Promise.all(promptPromises);

      const finalShots = [...updatedShots];
      const newGeneratedPrompts = [...generatedPrompts];

      results.forEach((result) => {
        if (result.success) {
          const i = result.index;

          finalShots[i] = {
            ...finalShots[i],
            isGenerating: false,
            isGenerated: true,
            image_start_prompt: result.prompt,
          };

          const promptIndex = newGeneratedPrompts.findIndex(
            (p) => p.shotIndex === i
          );

          if (promptIndex !== -1) {
            newGeneratedPrompts[promptIndex] = {
              ...newGeneratedPrompts[promptIndex],
              image_start_prompt: result.prompt,
            };
          } else {
            newGeneratedPrompts.push({
              shotIndex: i,
              image_start_prompt: result.prompt,
              ai_video_prompt: finalShots[i].ai_video_prompt || "",
            });
          }
        } else {
          finalShots[result.index] = {
            ...finalShots[result.index],
            isGenerating: false,
          };
        }
      });

      setShots(finalShots);
      setGeneratedPrompts(newGeneratedPrompts);
      setJsonString(JSON.stringify(finalShots, null, 2));

      toast.success("All prompts generated successfully!");
    } catch (error) {
      toast.error("Error generating prompts. Please try again.");
      const resetShots = shots.map((shot) => ({
        ...shot,
        isGenerating: false,
      }));

      setShots(resetShots);
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const generateAllImages = async () => {
    if (shots.length === 0) return;

    setIsGeneratingAllImages(true);
    const shotsToProcess = shots.filter((shot, index) => {
      if (!shot.image_start_prompt) return false;

      const existingImages = [
        ...(shot.generatedImage ? [shot.generatedImage] : []),
        ...(generatedImages[index] ? [generatedImages[index]] : []),
        ...(shot.uploadedImages || []),
      ].filter(Boolean);

      return existingImages.length < 3;
    });

    if (shotsToProcess.length === 0) {
      toast.info(
        "No shots need images generated (all shots either have 3 images already or no prompt)"
      );
      setIsGeneratingAllImages(false);
      return;
    }

    toast.info(`Generating images for ${shotsToProcess.length} shots...`);

    // Thiết lập trạng thái đang tạo ảnh cho tất cả các shot cần xử lý
    const newGeneratingStates = {};
    shotsToProcess.forEach((shot) => {
      const shotIndex = shots.indexOf(shot);
      newGeneratingStates[shotIndex] = true;
    });
    setGeneratingImageStates((prev) => ({
      ...prev,
      ...newGeneratingStates,
    }));

    try {
      const generatePromises = shotsToProcess.map(async (shot) => {
        const shotIndex = shots.indexOf(shot);

        try {
          const payload = {
            prompt: shot.image_start_prompt,
            size: "1024x1536",
            model: "gpt-image-1",
            quality: "medium",
            background: "auto",
            output_format: "png",
            output_compression: 0,
          };

          const result = await generate(payload);

          return {
            shotIndex,
            success: true,
            imageUrl: result?.imageUrl || result?.image_url,
            error: null,
          };
        } catch (error) {
          return {
            shotIndex,
            success: false,
            imageUrl: null,
            error,
          };
        }
      });

      const results = await Promise.all(generatePromises);
      const updatedShots = [...shots];
      const newGeneratedImages = [...generatedImages];

      results.forEach((result) => {
        const { shotIndex, success, imageUrl, error } = result;

        if (success && imageUrl) {
          if (!updatedShots[shotIndex].generatedImage) {
            updatedShots[shotIndex] = {
              ...updatedShots[shotIndex],
              generatedImage: imageUrl,
              selectedImageIndex: 0,
            };
          } else {
            newGeneratedImages[shotIndex] = imageUrl;

            const existingImages = [
              updatedShots[shotIndex].generatedImage,
              ...(updatedShots[shotIndex].uploadedImages || []),
            ].filter(Boolean);

            updatedShots[shotIndex] = {
              ...updatedShots[shotIndex],
              selectedImageIndex: existingImages.length,
            };
          }

          toast.success(`Generated image for Shot ${shotIndex + 1}`);
        } else {
          toast.error(`Failed to generate image for Shot ${shotIndex + 1}`);
        }
      });

      setGeneratedImages(newGeneratedImages);
      setShots(updatedShots);
      setJsonString(JSON.stringify(updatedShots, null, 2));

      toast.success("All image generation processes completed!");
    } catch (error) {
      toast.error("Error generating images. Please try again.");
    } finally {
      const resetStates = {};
      shotsToProcess.forEach((shot) => {
        const shotIndex = shots.indexOf(shot);
        resetStates[shotIndex] = false;
      });

      setGeneratingImageStates((prev) => ({
        ...prev,
        ...resetStates,
      }));

      setIsGeneratingAllImages(false);
    }
  };

  const handleUploadImage = (shotIndex, uploadedImages) => {
    const updatedShots = [...shots];
    updatedShots[shotIndex] = {
      ...updatedShots[shotIndex],
      uploadedImages,
    };

    setShots(updatedShots);
    setJsonString(JSON.stringify(updatedShots, null, 2));
  };

  const handleSelectImage = (shotIndex, imageIndex) => {
    const updatedShots = [...shots];
    updatedShots[shotIndex] = {
      ...updatedShots[shotIndex],
      selectedImageIndex: imageIndex,
    };

    setShots(updatedShots);
    setJsonString(JSON.stringify(updatedShots, null, 2));
  };

  const handleGenerateImage = async (shotIndex) => {
    const shot = shots[shotIndex];
    const existingImages = [
      ...(shot.generatedImage ? [shot.generatedImage] : []),
      ...(generatedImages[shotIndex] ? [generatedImages[shotIndex]] : []),
      ...(shot.uploadedImages || []),
    ].filter(Boolean);

    if (existingImages.length >= 3) {
      toast.error("Maximum of 3 images allowed per shot");
      return;
    }

    setGeneratingImageStates((prev) => ({
      ...prev,
      [shotIndex]: true,
    }));

    try {
      const payload = {
        prompt: shot.image_start_prompt,
        size: "1024x1536",
        model: "gpt-image-1",
        quality: "medium",
        background: "auto",
        output_format: "png",
        output_compression: 0,
      };
      const result = await generate(payload);

      if (result && result.image_url) {
        const updatedShots = JSON.parse(JSON.stringify(shots));
        const newGeneratedImagesArray = [...generatedImages];
        if (!updatedShots[shotIndex].generatedImage) {
          updatedShots[shotIndex] = {
            ...updatedShots[shotIndex],
            generatedImage: result.image_url,
            selectedImageIndex: 0,
          };
        } else {
          newGeneratedImagesArray[shotIndex] = result.image_url;
          updatedShots[shotIndex] = {
            ...updatedShots[shotIndex],
            selectedImageIndex: existingImages.length,
          };
        }

        setGeneratedImages(newGeneratedImagesArray);
        setShots(updatedShots);
        setJsonString(JSON.stringify(updatedShots, null, 2));

        toast.success("Image generated successfully!");
      } else {
        toast.error("Failed to generate image");
      }
    } catch (error) {
      toast.error("Error generating image. Please try again.");
    } finally {
      setGeneratingImageStates((prev) => ({
        ...prev,
        [shotIndex]: false,
      }));
    }
  };

  return (
    <div className="w-full mx-auto bg-white rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Shot Generated</h2>
        <div className="flex gap-2">
          <Button
            onClick={copyToClipboard}
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            {isCopied ? <Check size={14} /> : <Copy size={14} />}
            {isCopied ? "Copied" : "Copy"}
          </Button>

          <Button
            onClick={toggleEdit}
            variant={isEditing ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-1"
          >
            <Edit size={14} />
            {isEditing ? "Editing" : "Edit JSON"}
          </Button>

          <Button
            onClick={generatePromptsForAllShots}
            variant="default"
            size="sm"
            className="flex items-center gap-1"
            disabled={isGeneratingPrompts || shots.length === 0}
          >
            <Film size={14} />
            {isGeneratingPrompts ? "Generating prompts..." : "Generate prompts"}
          </Button>

          <Button
            onClick={() => generateAllImages()}
            variant="default"
            size="sm"
            className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
            disabled={isGeneratingAllImages || shots.length === 0}
          >
            <ImageIcon size={14} />
            {isGeneratingAllImages
              ? "Generating images..."
              : "Generate all images"}
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="mb-4">
          <textarea
            value={jsonString}
            onChange={handleJsonChange}
            className="w-full p-4 border border-gray-300 rounded-md font-mono text-sm h-64"
            placeholder="Enter JSON here..."
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button
              onClick={() => setIsEditing(false)}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={saveJson}
              size="sm"
              className="flex items-center gap-1"
            >
              <Save size={14} />
              Save changes
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {shots.map((shot, index) => (
              <Card
                key={index}
                className="border border-gray-200 overflow-hidden"
              >
                <div className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="font-medium">Shot {shot.shot}</div>
                      {shot.isGenerated && (
                        <div className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                          Prompt generated
                        </div>
                      )}
                      {shot.isGenerating && (
                        <div className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full animate-pulse">
                          Generating prompt...
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!editingShot || editingShot.index !== index ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => startEditingShot(index, shot)}
                          >
                            <Edit size={16} />
                          </Button>
                        </>
                      ) : (
                        <div className="mr-2 text-xs text-blue-600">
                          Editing
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={() => deleteShot(index)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>

                  {editingShot && editingShot.index === index ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Duration
                          </label>
                          <input
                            type="text"
                            value={editingShot.duration}
                            onChange={(e) =>
                              handleShotInputChange("duration", e.target.value)
                            }
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={editingShot.description}
                          onChange={(e) =>
                            handleShotInputChange("description", e.target.value)
                          }
                          className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          rows={2}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          CGI Elements
                        </label>
                        {(editingShot.CGI_elements || []).map(
                          (element, idx) => (
                            <div key={idx} className="flex mb-2">
                              <input
                                type="text"
                                value={element}
                                onChange={(e) =>
                                  handleCGIElementChange(idx, e.target.value)
                                }
                                className="flex-grow p-2 border border-gray-300 rounded-md text-sm mr-2"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500"
                                onClick={() => removeCGIElement(idx)}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          )
                        )}
                        <Button
                          onClick={addCGIElement}
                          variant="outline"
                          size="sm"
                          className="mt-1"
                        >
                          <PlusCircle size={14} className="mr-1" />
                          Add CGI Element
                        </Button>
                      </div>

                      <div className="border-t border-gray-200 pt-3 mt-3">
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Image Prompt
                          </label>
                          <textarea
                            value={editingShot.image_start_prompt}
                            onChange={(e) =>
                              handleShotInputChange(
                                "image_start_prompt",
                                e.target.value
                              )
                            }
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                            rows={2}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Video Prompt
                          </label>
                          <textarea
                            value={editingShot.ai_video_prompt}
                            onChange={(e) =>
                              handleShotInputChange(
                                "ai_video_prompt",
                                e.target.value
                              )
                            }
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                            rows={3}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelShotEdit}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={saveShotChanges}>
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm border-t border-gray-200 pt-3">
                        <div>
                          <div className="text-xs font-medium text-gray-500">
                            Duration:
                          </div>
                          <div className="font-medium">{shot.duration}</div>
                        </div>
                        <div className="md:col-span-2">
                          <div className="text-xs font-medium text-gray-500">
                            Description:
                          </div>
                          <div className="font-medium">{shot.description}</div>
                        </div>
                        <div className="md:col-span-2">
                          <div className="text-xs font-medium text-gray-500">
                            CGI Elements:
                          </div>
                          {shot.CGI_elements && shot.CGI_elements.length > 0 ? (
                            <ul className="list-disc pl-5">
                              {shot.CGI_elements.map((element, idx) => (
                                <li key={idx} className="font-medium">
                                  {element}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="font-medium text-gray-400">
                              No CGI elements
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Use the ImageGenerated component here */}
                      <ImageGenerated
                        shot={shot}
                        index={index}
                        generatingImageStates={generatingImageStates}
                        generatedImages={generatedImages}
                        copyPrompt={copyPrompt}
                        copiedPromptInfo={copiedPromptInfo}
                        onGenerateImage={handleGenerateImage}
                        onUploadImage={handleUploadImage}
                        onSelectImage={handleSelectImage}
                      />
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <Button
            onClick={addNewShot}
            variant="outline"
            className="w-full py-3 flex items-center justify-center gap-1"
          >
            <PlusCircle size={16} />
            Add New Shot
          </Button>
        </>
      )}
    </div>
  );
};

export default ScriptGenerated;
