import {
  Settings,
  RectangleHorizontal,
  SquareUser,
  Square,
} from "lucide-react";

export const HTTP_METHOD = {
  GET: "GET",
  POST: "POST",
  DELETE: "DELETE",
  PUT: "PUT",
};

export const languages = [
  { value: "polish", label: "Polish" },
  { value: "english", label: "English" },
  { value: "spanish", label: "Spanish" },
  { value: "french", label: "French" },
  { value: "german", label: "German" },
  { value: "italian", label: "Italian" },
  { value: "portuguese", label: "Portuguese" },
  { value: "russian", label: "Russian" },
  { value: "japanese", label: "Japanese" },
  { value: "chinese", label: "Chinese" },
  { value: "vietnamese", label: "Vietnamese" },
];

export const modelOptions = {
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

export const templateString =
  "You are a creative banner designer, please give me 3 innovative and extremely creative ideas to make a sales banner for the product in the photo, you can refer to the product description here: {prompt input} returns me the image in json and markdown file format with the structure as the example below, note that the Main text is the language {language} " +
  `[
  {
    "Idea 1: ..............": {
      Concept: "..............",
      Design: {
        Background: "............",
        Effect: ".............",
        "Main text": ["...................", "Royal Fashion ............."],
      },
    },
  },
  {
    "Idea 2: ..............": {
      Concept: "..............",
      Design: {
        Background: "............",
        Effect: ".............",
        "Main text": ["...................", "Royal Fashion ............."],
      },
    },
  },
  {
    "Idea 3: ..............": {
      Concept: "..............",
      Design: {
        Background: "............",
        Effect: ".............",
        "Main text": ["...................", "Royal Fashion ............."],
      },
    },
  },
]`;

export const dimensionOptions = [
  { name: "16:9 Landscape", width: 832, height: 480 },
  { name: "9:16 Portrait", width: 480, height: 832 },
  { name: "2:3 Portrait", width: 512, height: 768 },
  { name: "4:5 Portrait", width: 576, height: 720 },
];

export const vibeOptions = [
  {
    name: "Clay",
    id: "964d8a8f-865b-48c5-b79e-e75ae8727648",
    img: "src/assets/clay.webp",
  },
  {
    name: "Color Sketch",
    id: "9cdfea2a-b4ab-4e97-a558-ec9fcb78f30a",
    img: "src/assets/color-sketch.webp",
  },
  {
    name: "Logo",
    id: "12b0d8c9-5cf8-4094-a3e5-6809bc269e21",
    img: "src/assets/logo.webp",
  },
  {
    name: "Papercraft",
    id: "c4ac9781-8624-4b7d-bbed-dedaaf7b9da6",
    img: "src/assets/papercraft.webp",
  },
  {
    name: "Pro Photo",
    id: "28a53b2e-eb80-41d7-8360-208068fecf49",
    img: "src/assets/pro-photo.webp",
  },
  {
    name: "Sci-Fi",
    id: "d28c8f2b-22bb-4c0c-893d-d3835e28f2f7",
    img: "src/assets/sci-fi.webp",
  },
  {
    name: "Sketch",
    id: "6078b232-d1be-4a01-9c10-95c05132a8e4",
    img: "src/assets/sketch.webp",
  },
  {
    name: "Stock Footage",
    id: "d760b628-4a1d-41cb-bccb-053a13973b94",
    img: "src/assets/stock-footage.webp",
  },
  {
    name: "Streetshot",
    id: "5658d8ce-d486-4501-a701-7832395a8962",
    img: "src/assets/streetshot.webp",
  },
];

export const lightingOptions = [
  {
    name: "Backlight",
    id: "c39fe4f8-76d6-4aad-899b-e7ca5a4148f3",
    img: "src/assets/blacklight.webp",
  },
  {
    name: "Candle Lit",
    id: "7d36972e-b9d5-46c7-813d-2c9934f9321b",
    img: "src/assets/candle-lit.webp",
  },
  {
    name: "Chiaroscuro",
    id: "ff9bfd01-a7ac-4556-889a-25dd5fc0956f",
    img: "src/assets/chiaroscuro.webp",
  },
  {
    name: "Film Haze",
    id: "be32c760-2bb3-49ae-83dc-6f9b2d62a97f",
    img: "src/assets/film-haze.webp",
  },
  {
    name: "Foggy",
    id: "1d6e92d2-6e83-4ea2-bd4c-34ddfedfa163",
    img: "src/assets/foggy.webp",
  },
  {
    name: "Golden Hour",
    id: "3f705252-1197-4f59-b6ed-21625dce6a65",
    img: "src/assets/golden-hour.webp",
  },
  {
    name: "Hardlight",
    id: "64b84d56-8b76-4367-95a6-df345a909af0",
    img: "src/assets/hardlight.webp",
  },
  {
    name: "Lens Flare",
    id: "4b60b356-a4ab-4983-9e9a-30e0d5b27bc6",
    img: "src/assets/lens-flare.webp",
  },
  {
    name: "Light Art",
    id: "771bc1bd-0f88-4ff9-af63-f646847ed075",
    img: "src/assets/light-art.webp",
  },
  {
    name: "Low Key",
    id: "1974bd47-75bb-499a-9c7a-354913904fcf",
    img: "src/assets/lowkey.webp",
  },
  {
    name: "Luminous",
    id: "994e33e6-4862-495d-9efb-d9a09ecdd769",
    img: "src/assets/luminous.webp",
  },
  {
    name: "Mystical",
    id: "acb9deb3-31e3-495e-ab31-b138fde26bd6",
    img: "src/assets/mystical.webp",
  },
  {
    name: "Rainy",
    id: "fa347beb-6d70-482d-94a8-a70736e9e7f1",
    img: "src/assets/rainy.webp",
  },
  {
    name: "Soft Light",
    id: "746e70e5-ab4d-4f39-9057-75698cb64bc2",
    img: "src/assets/soft-light.webp",
  },
  {
    name: "Volumetric",
    id: "92c2d8d4-9757-4cbf-88f3-d7ea54c425af",
    img: "src/assets/volumetric.webp",
  },
];

export const shotTypeOptions = [
  {
    name: "Bokeh",
    id: "2e2669d5-4473-4ab9-b476-9f0a314bf661",
    img: "src/assets/bokeh.webp",
  },
  {
    name: "Cinematic",
    id: "a0f4907f-8cd0-41de-b67c-460ec3a2bda0",
    img: "src/assets/cinematic.webp",
  },
  {
    name: "Close Up",
    id: "ba6baeab-1a8f-4cb8-b0f5-efc13a805371",
    img: "src/assets/close-up.webp",
  },
  {
    name: "Overhead",
    id: "8eb75811-5148-40ac-8abc-531e64f6e269",
    img: "src/assets/overhead.webp",
  },
  {
    name: "Spiritual",
    id: "8b5f5d7f-fd3f-4235-92a4-baa9f8507fbb",
    img: "src/assets/spiritual.webp",
  },
  {
    name: "Spooky",
    id: "49dfd828-5473-4594-9187-c6129aeaa4bf",
    img: "src/assets/spooky.webp",
  },
];

export const colorThemeOptions = [
  {
    name: "Autumn",
    id: "21b0a3e9-304a-4ff2-9603-15ddbc5a6b82",
    img: "src/assets/autumn.webp",
  },
  {
    name: "Complimentary",
    id: "dcfb60ca-f165-407f-b01c-2b34d22432c2",
    img: "src/assets/complimentary.webp",
  },
  {
    name: "Cool",
    id: "913efd9b-1da8-4876-91d3-b6de0aa5582c",
    img: "src/assets/cool.webp",
  },
  {
    name: "Dark",
    id: "9581d460-7023-4d85-b440-9fea8bbfe194",
    img: "src/assets/dark.webp",
  },
  {
    name: "Earthy",
    id: "9517dd8e-9588-4fe5-aede-6711438dd420",
    img: "src/assets/earthy.webp",
  },
  {
    name: "Electric",
    id: "d26aded5-e191-45d5-9662-db36b7085a76",
    img: "src/assets/electric.webp",
  },
  {
    name: "Iridescent",
    id: "2380bd07-caf1-4ae6-a348-3bcf4b12f90a",
    img: "src/assets/iridescent.webp",
  },
  {
    name: "Pastel",
    id: "6c27f994-2e03-4d07-95b8-4a5db5bd3a27",
    img: "src/assets/pastel.webp",
  },
  {
    name: "Split",
    id: "1bffb3f3-4110-4185-85f9-f7254ae6f81d",
    img: "src/assets/split.webp",
  },
  {
    name: "Terracotta Teal",
    id: "46af026e-d21a-4cf4-a0c0-b482e6800331",
    img: "src/assets/terracotta-teal.webp",
  },
  {
    name: "Ultraviolet",
    id: "9243b709-ed08-49d9-9198-440f2127d3b5",
    img: "src/assets/ultraviolet.webp",
  },
  {
    name: "Vibrant",
    id: "f84bbf31-1d72-415d-ae4c-deb4b18fccba",
    img: "src/assets/vibrant.webp",
  },
  {
    name: "Warm",
    id: "d838fb14-9719-44f3-877e-da70d072b79c",
    img: "src/assets/warm.webp",
  },
];

export const templateFacebookString = `You are a social media expert with many years of experience, please write caption, headline, description in {language} for facebook ads with the above photo and this product description: "{prompt input}" Note to write caption maximum 100-200 words, try to write carefully the first 3 lines because it is extremely important → need strong hook (question, problem, benefit) Use emoji to create highlights If the caption is long, divide it into short paragraphs, avoid writing 1 long block return in json format with caption headlines description:
{ "caption": "....................", 
   "headlines": "....................", 
   "description": "....................." 
}`;

export const templateInstagramString = `you are a social media expert with many years of experience, please write caption in {language} for instagram with the above photo and this product description: "{prompt input}"Note to write caption maximum 100-150 words, Caption should have:Strong first hook (question, compelling statement).Specific information or emotion (why is the product worth caring about?).Hashtags – help increase reachUse 5–15 relevant hashtags (don't spam 30).Incorporate:Brand hashtag:Product hashtag:Market hashtag:return in json format with caption headlines description{"caption": "...................."} `;

export const autoPrompt =
  "write me a short description of the full product in the photo, pay attention to describe important details to advertise the product. return as json, just write description, don't write anything else";
