/* eslint-disable no-unused-vars */
export const formatStoryboardData = (response) => {
  try {
    if (!response || !response.content) {
      return [];
    }

    let parsedContent;
    try {
      parsedContent = JSON.parse(response.content);
    } catch (_) {
      try {
        const cleanedContent = response.content
          .replace(/\\+"/g, '\\"')
          .replace(/\n/g, "");

        parsedContent = JSON.parse(cleanedContent);
      } catch (_) {
        return [];
      }
    }

    if (!Array.isArray(parsedContent)) {
      return [];
    }

    return parsedContent.map((shot, index) => ({
      shot: shot.shot || (index + 1).toString(),
      scene_description: shot.scene_description || "",
      camera_movement: shot.camera_movement || "",
      visual_effects: shot.visual_effects || "",
      on_screen_text_if_need: shot.on_screen_text_if_need || "",
      mood: shot.mood || "",
      duration: shot.duration || "4s",
      image_start_prompt: shot.image_start_prompt || "",
      ai_video_prompt: shot.ai_video_prompt || "",
      isGenerating: false,
      isGenerated: false,
    }));
  } catch (_) {
    return [];
  }
};
