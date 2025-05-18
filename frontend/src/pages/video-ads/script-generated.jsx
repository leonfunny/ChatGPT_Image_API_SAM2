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
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PROMPT_GENERATE_IMAGE_AND_VIDEO } from "./constant";
import {
  promptGenerating as apiPromptGenerating,
  editImage as apiEditImage,
} from "@/services/picture-ads";
import { toast } from "sonner";
import { formatStoryboardData } from "./function";

const generateShotPrompt = async (shot) => {
  const formData = new FormData();
  formData.append("model", "gpt-4.1");

  const shotDetails = `Scene: ${shot.scene_description}
Camera Movement: ${shot.camera_movement}
Visual Effects: ${shot.visual_effects}
On Screen Text: ${shot.on_screen_text_if_need}
Mood: ${shot.mood}
Duration: ${shot.duration}`;

  const customizedPrompt = PROMPT_GENERATE_IMAGE_AND_VIDEO.replace(
    "{responsive_shot_1)",
    shotDetails
  );

  formData.append("prompt", customizedPrompt);

  const response = await apiPromptGenerating(formData);
  let promptData = {};
  if (response && response.content) {
    const cleanedContent = response.content
      .replace(/\\r\\n/g, "\\n")
      .replace(/\r\n/g, "\n")
      .replace(/[\t\n\r]/g, " ")
      .replace(/\\"/g, '"')
      .replace(/"([^"]*)":/g, function (match, p1) {
        return '"' + p1 + '":';
      });

    promptData = JSON.parse(cleanedContent);
  }

  return {
    image_start_prompt: promptData.image_start_prompt || "",
    ai_video_prompt: promptData.ai_video_prompt || "",
  };
};

const ScriptGenerated = ({ apiResponse, sourceImage }) => {
  const [shots, setShots] = useState(formatStoryboardData(apiResponse));
  const [jsonString, setJsonString] = useState(
    JSON.stringify(formatStoryboardData(apiResponse), null, 2)
  );
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
    const formattedData = formatStoryboardData(apiResponse);
    setShots(formattedData);
    setJsonString(JSON.stringify(formattedData, null, 2));
    setGeneratedPrompts(
      formattedData.map((shot, index) => ({
        shotIndex: index,
        image_start_prompt: shot.image_start_prompt || "",
        ai_video_prompt: shot.ai_video_prompt || "",
      }))
    );

    setGeneratedImages(formattedData.map(() => null));
    setGeneratingImageStates({});
  }, [apiResponse]);

  const handleJsonChange = (e) => {
    const newJsonString = e.target.value;
    setJsonString(newJsonString);
    const parsedJson = JSON.parse(newJsonString);
    const formattedData = parsedJson.map((shot, index) => ({
      shot: shot.shot || (index + 1).toString(),
      scene_description: shot.scene_description || "",
      camera_movement: shot.camera_movement || "",
      visual_effects: shot.visual_effects || "",
      on_screen_text_if_need: shot.on_screen_text_if_need || "",
      mood: shot.mood || "",
      duration: shot.duration || "4s",
      image_start_prompt: shot.image_start_prompt || "",
      ai_video_prompt: shot.ai_video_prompt || "",
      isGenerating: shot.isGenerating || false,
      isGenerated: shot.isGenerated || false,
      generatedImage: shot.generatedImage || null,
      isGeneratingImage: shot.isGeneratingImage || false,
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
    const parsedJson = JSON.parse(jsonString);
    const formattedData = parsedJson.map((shot, index) => ({
      shot: shot.shot || (index + 1).toString(),
      scene_description: shot.scene_description || "",
      camera_movement: shot.camera_movement || "",
      visual_effects: shot.visual_effects || "",
      on_screen_text_if_need: shot.on_screen_text_if_need || "",
      mood: shot.mood || "",
      duration: shot.duration || "4s",
      image_start_prompt: shot.image_start_prompt || "",
      ai_video_prompt: shot.ai_video_prompt || "",
      isGenerating: shot.isGenerating || false,
      isGenerated: shot.isGenerated || false,
      generatedImage: shot.generatedImage || null,
      isGeneratingImage: shot.isGeneratingImage || false,
    }));
    setShots(formattedData);

    const newGeneratedPrompts = formattedData.map((shot, index) => ({
      shotIndex: index,
      image_start_prompt: shot.image_start_prompt || "",
      ai_video_prompt: shot.ai_video_prompt || "",
    }));
    setGeneratedPrompts(newGeneratedPrompts);

    setIsEditing(false);
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

  const saveShotChanges = () => {
    const newShots = [...shots];
    newShots[editingShot.index] = {
      shot: editingShot.shot,
      scene_description: editingShot.scene_description,
      camera_movement: editingShot.camera_movement,
      visual_effects: editingShot.visual_effects,
      on_screen_text_if_need: editingShot.on_screen_text_if_need,
      mood: editingShot.mood,
      duration: editingShot.duration,
      image_start_prompt: editingShot.image_start_prompt || "",
      ai_video_prompt: editingShot.ai_video_prompt || "",
      isGenerating: editingShot.isGenerating || false,
      isGenerated: editingShot.isGenerated || false,
      generatedImage: editingShot.generatedImage || null,
      isGeneratingImage: editingShot.isGeneratingImage || false,
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
  };

  const cancelShotEdit = () => {
    setEditingShot(null);
  };

  const addNewShot = () => {
    const newShot = {
      shot: (shots.length + 1).toString(),
      scene_description: "",
      camera_movement: "",
      visual_effects: "",
      on_screen_text_if_need: "",
      mood: "",
      duration: "4s",
      image_start_prompt: "",
      ai_video_prompt: "",
      isGenerating: false,
      isGenerated: false,
      generatedImage: null,
      isGeneratingImage: false,
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
    }
  };

  const generatePromptsForAllShots = async () => {
    if (shots.length === 0) {
      alert("No shots available to generate prompts.");
      return;
    }

    setIsGeneratingPrompts(true);

    try {
      const updatingShots = shots.map((shot) => ({
        ...shot,
        isGenerating: true,
      }));
      setShots(updatingShots);

      const promptPromises = updatingShots.map((shot) =>
        generateShotPrompt(shot)
      );
      const results = await Promise.all(promptPromises);

      const updatedShots = updatingShots.map((shot, index) => {
        const result = results[index];
        return {
          ...shot,
          isGenerating: false,
          isGenerated: true,
          image_start_prompt:
            result.image_start_prompt || shot.image_start_prompt || "",
          ai_video_prompt: result.ai_video_prompt || shot.ai_video_prompt || "",
        };
      });

      setShots(updatedShots);
      setJsonString(JSON.stringify(updatedShots, null, 2));

      const newGeneratedPrompts = updatedShots.map((shot, index) => ({
        shotIndex: index,
        image_start_prompt: shot.image_start_prompt || "",
        ai_video_prompt: shot.ai_video_prompt || "",
      }));
      setGeneratedPrompts(newGeneratedPrompts);
    } catch (error) {
      const resetShots = shots.map((shot) => ({
        ...shot,
        isGenerating: false,
      }));
      setShots(resetShots);
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const generateImageForShot = async (shotIndex, prevImageUrl = null) => {
    if (!shots[shotIndex].image_start_prompt) {
      toast.error(`Shot ${shotIndex + 1} has no Image Prompt.`);
      return;
    }

    try {
      const updatingShots = [...shots];
      updatingShots[shotIndex] = {
        ...updatingShots[shotIndex],
        isGeneratingImage: true,
      };

      const formData = new FormData();
      const inputImage = shotIndex === 0 ? sourceImage : prevImageUrl;

      if (!inputImage) {
        throw new Error("No source image to create the shot.");
      }

      if (typeof inputImage === "string" && inputImage.startsWith("http")) {
        const response = await fetch(inputImage);
        const blob = await response.blob();
        formData.append("image", blob, "previous_image.jpg");
      } else if (inputImage instanceof File) {
        formData.append("image", inputImage);
      } else {
        formData.append("image", inputImage);
      }

      formData.append("prompt", shots[shotIndex].image_start_prompt);

      const result = await apiEditImage(formData);

      if (!result || !result.image_url) {
        throw new Error("No image URL received from API.");
      }

      updatingShots[shotIndex] = {
        ...updatingShots[shotIndex],
        isGeneratingImage: false,
        generatedImage: result.image_url,
      };
      setShots(updatingShots);

      return result.image_url;
    } catch (error) {
      toast.error(
        `Error generating image for shot ${shotIndex + 1}: ${error.message}`
      );

      const updatingShots = [...shots];
      updatingShots[shotIndex] = {
        ...updatingShots[shotIndex],
        isGeneratingImage: false,
      };
      setShots(updatingShots);

      return null;
    }
  };

  const generateAllImages = async () => {
    if (!sourceImage) {
      toast.error("No source image to start generating images.");
      return;
    }

    if (shots.length === 0) {
      toast.error("No shots available to generate images.");
      return;
    }

    try {
      setIsGeneratingAllImages(true);
      const newGeneratedImages = [...generatedImages];
      let previousImageUrl = null;

      for (let i = 0; i < shots.length; i++) {
        if (!shots[i].image_start_prompt) {
          toast.warning(`Shot ${i + 1} has no Image Prompt, skipping.`);
          continue;
        }

        const inputImage = i === 0 ? sourceImage : previousImageUrl;

        if (!inputImage) {
          toast.error(
            `Cannot generate image for Shot ${
              i + 1
            } because there is no input image.`
          );
          break;
        }

        setGeneratingImageStates((prev) => ({
          ...prev,
          [i]: true,
        }));

        try {
          const result = await generateImageForShot(i, inputImage);
          if (result) {
            newGeneratedImages[i] = result;
            setGeneratedImages([...newGeneratedImages]);

            const updatedShots = [...shots];
            updatedShots[i] = {
              ...updatedShots[i],
              generatedImage: result,
            };
            setShots(updatedShots);

            previousImageUrl = result;
          } else {
            toast.error(`Unable to generate image for Shot ${i + 1}.`);
          }
        } finally {
          setGeneratingImageStates((prev) => ({
            ...prev,
            [i]: false,
          }));
        }
      }

      toast.success("All images have been generated!");
    } catch (error) {
      toast.error("Error generating images for shots.");
    } finally {
      setIsGeneratingAllImages(false);
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
            onClick={generateAllImages}
            variant="default"
            size="sm"
            className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
            disabled={
              isGeneratingAllImages || !sourceImage || shots.length === 0
            }
          >
            <ImageIcon size={14} />
            {isGeneratingAllImages ? "Generating images..." : "Generate images"}
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
                            Duration (seconds)
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
                          Scene Description
                        </label>
                        <textarea
                          value={editingShot.scene_description}
                          onChange={(e) =>
                            handleShotInputChange(
                              "scene_description",
                              e.target.value
                            )
                          }
                          className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Camera Movement
                          </label>
                          <input
                            type="text"
                            value={editingShot.camera_movement}
                            onChange={(e) =>
                              handleShotInputChange(
                                "camera_movement",
                                e.target.value
                              )
                            }
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Visual Effects
                          </label>
                          <input
                            type="text"
                            value={editingShot.visual_effects}
                            onChange={(e) =>
                              handleShotInputChange(
                                "visual_effects",
                                e.target.value
                              )
                            }
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            On-Screen Text
                          </label>
                          <input
                            type="text"
                            value={editingShot.on_screen_text_if_need}
                            onChange={(e) =>
                              handleShotInputChange(
                                "on_screen_text_if_need",
                                e.target.value
                              )
                            }
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Mood
                          </label>
                          <input
                            type="text"
                            value={editingShot.mood}
                            onChange={(e) =>
                              handleShotInputChange("mood", e.target.value)
                            }
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
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
                            Scene Description:
                          </div>
                          <div className="font-medium">
                            {shot.scene_description}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-500">
                            Camera Movement:
                          </div>
                          <div className="font-medium">
                            {shot.camera_movement}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-500">
                            Visual Effects:
                          </div>
                          <div className="font-medium">
                            {shot.visual_effects}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-500">
                            On-Screen Text:
                          </div>
                          <div className="font-medium">
                            {shot.on_screen_text_if_need}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-500">
                            Mood:
                          </div>
                          <div className="font-medium">{shot.mood}</div>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-gray-200 pt-3">
                        <div className="mb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <ImageIcon size={14} className="mr-1" />
                              <div className="text-xs font-medium text-gray-500">
                                Image Prompt:
                              </div>
                            </div>
                            <Button
                              onClick={() => copyPrompt(index, "image")}
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                            >
                              {copiedPromptInfo.index === index &&
                              copiedPromptInfo.type === "image" ? (
                                <Check size={12} className="mr-1" />
                              ) : (
                                <Copy size={12} className="mr-1" />
                              )}
                              Copy
                            </Button>
                          </div>
                          <div className="text-sm mt-1 bg-gray-50 p-2 rounded">
                            {shot.image_start_prompt || "Not generated"}
                          </div>
                        </div>
                        <div>
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

                      <div className="mt-3 border-t border-gray-200 pt-3">
                        <div className="flex items-center mb-2">
                          <ImageIcon size={14} className="mr-1" />
                          <div className="text-xs font-medium text-gray-500">
                            Generated Image:
                          </div>
                        </div>

                        {generatingImageStates[index] ? (
                          <div className="flex items-center justify-center h-40 bg-gray-50 rounded">
                            <div className="flex flex-col items-center">
                              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                              <p className="mt-2 text-sm text-gray-500">
                                Generating image...
                              </p>
                            </div>
                          </div>
                        ) : generatedImages[index] ? (
                          <div className="relative h-64 bg-gray-50 rounded overflow-hidden">
                            <img
                              src={generatedImages[index]}
                              alt={`Generated image for Shot ${index + 1}`}
                              className="w-full h-full object-contain"
                              style={{
                                border: "1px solid #ddd",
                                backgroundColor: "#f8f9fa",
                              }}
                            />
                            <div className="absolute bottom-2 right-2 bg-white bg-opacity-80 rounded px-2 py-1 text-xs">
                              <a
                                href={generatedImages[index]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                Open in new tab
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-40 bg-gray-50 rounded border border-dashed border-gray-300">
                            <p className="text-sm text-gray-500">
                              No image generated for this shot
                            </p>
                          </div>
                        )}

                        {generatedImages[index] && (
                          <div className="mt-2 text-xs">
                            <span className="text-gray-600">Image URL: </span>
                            <a
                              href={generatedImages[index]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 break-all hover:underline"
                            >
                              {generatedImages[index]}
                            </a>
                          </div>
                        )}
                      </div>
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
