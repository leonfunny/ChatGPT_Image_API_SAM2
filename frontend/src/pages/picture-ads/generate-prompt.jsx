import React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { languages } from "@/utils/constants";

const GeneratePromptStep = ({
  promptInput,
  setPromptInput,
  language,
  setLanguage,
  onContinue,
  processing,
}) => {
  return (
    <Card className="border-2 border-primary/70">
      <CardHeader>
        <CardTitle>Step 1: Generate Prompt</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt_input" className="text-base font-medium">
            Prompt Input
          </Label>
          <Textarea
            id="prompt_input"
            placeholder="Describe your product in detail. The more specific you are, the better ideas you'll get..."
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            className="min-h-24"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-base font-medium">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button
          onClick={onContinue}
          className="px-8"
          disabled={processing || !promptInput.trim()}
        >
          {processing ? "Generating Ideas..." : "Generate Ideas"}{" "}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GeneratePromptStep;
