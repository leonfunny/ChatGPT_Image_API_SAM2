import React, { useState } from "react";
import ImageToVideoApp from "./image-to-video";
import LeonardoTextToVideo from "./text-to-video";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AppSelector = () => {
  const [selectedApp, setSelectedApp] = useState("image-to-video");

  const handleAppChange = (value) => {
    setSelectedApp(value);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 max-w-xs">
        <h2 className="text-lg font-medium mb-2">Choose app:</h2>
        <Select defaultValue="image-to-video" onValueChange={handleAppChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose app" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>App</SelectLabel>
              <SelectItem value="image-to-video">Image to Video App</SelectItem>
              <SelectItem value="text-to-video">Text to Video App</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4">
        {selectedApp === "image-to-video" ? (
          <ImageToVideoApp />
        ) : (
          <LeonardoTextToVideo />
        )}
      </div>
    </div>
  );
};

export default AppSelector;
