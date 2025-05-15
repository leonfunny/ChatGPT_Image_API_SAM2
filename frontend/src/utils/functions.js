export const extractJsonFromContent = (content) => {
  if (!content) return null;
  if (content.includes("```json")) {
    const regex = /```json\n([\s\S]*?)\n```/;
    const match = content.match(regex);

    if (match && match[1]) {
      return processJsonContent(match[1]);
    }
  } else if (content.trim().startsWith("[")) {
    const cleanContent = content.replace(/\\"/g, '"').replace(/\\n/g, "\n");

    return processJsonContent(cleanContent);
  }
};

const processJsonContent = (jsonStr) => {
  try {
    const parsed = JSON.parse(jsonStr);

    if (Array.isArray(parsed)) {
      const transformed = {};
      parsed.forEach((item) => {
        const ideaKey = Object.keys(item)[0];
        if (ideaKey) {
          transformed[ideaKey] = item[ideaKey];
        }
      });
      return transformed;
    }

    return parsed;
  } catch (e) {
    console.error("Lỗi khi phân tích JSON:", e);
    return null;
  }
};
