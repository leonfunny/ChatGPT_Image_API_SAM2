import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Pencil, X } from "lucide-react";

const IdeaCard = ({ title, details, onUpdate, index }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [editedConcept, setEditedConcept] = useState(details.Concept);
  const [editedBackground, setEditedBackground] = useState(
    details.Design.Background
  );
  const [editedEffect, setEditedEffect] = useState(details.Design.Effect);
  const [editedMainTexts, setEditedMainTexts] = useState([
    ...details.Design["Main text"],
  ]);

  const handleSaveChanges = () => {
    // Create updated details object
    const updatedDetails = {
      Concept: editedConcept,
      Design: {
        Background: editedBackground,
        Effect: editedEffect,
        "Main text": editedMainTexts,
      },
    };

    if (onUpdate) {
      onUpdate(index, editedTitle, updatedDetails);
    }

    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    // Reset all values to original
    setEditedTitle(title);
    setEditedConcept(details.Concept);
    setEditedBackground(details.Design.Background);
    setEditedEffect(details.Design.Effect);
    setEditedMainTexts([...details.Design["Main text"]]);
    setIsEditing(false);
  };

  const handleUpdateMainText = (idx, text) => {
    const updatedTexts = [...editedMainTexts];
    updatedTexts[idx] = text;
    setEditedMainTexts(updatedTexts);
  };

  const handleAddMainText = () => {
    setEditedMainTexts([...editedMainTexts, ""]);
  };

  const handleRemoveMainText = (idx) => {
    const updatedTexts = editedMainTexts.filter((_, i) => i !== idx);
    setEditedMainTexts(updatedTexts);
  };

  // Read-only view
  if (!isEditing) {
    return (
      <Card className="hover:shadow-md transition-shadow overflow-hidden">
        <CardHeader className="bg-gray-50 p-3">
          <div className="flex justify-between items-start">
            <CardTitle className="text-md font-bold text-purple-700">
              {title}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="px-2 h-8"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <p className="text-sm text-gray-600 italic mb-3">{details.Concept}</p>

          <div className="space-y-2 text-sm">
            <div className="flex">
              <span className="font-medium text-gray-700 min-w-20 mr-2">
                Background:
              </span>
              <span className="text-gray-600">{details.Design.Background}</span>
            </div>
            <div className="flex">
              <span className="font-medium text-gray-700 min-w-20">
                Effect:
              </span>
              <span className="text-gray-600">{details.Design.Effect}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700 block mb-1">
                Main text:
              </span>
              <ul className="list-disc list-inside pl-2">
                {details.Design["Main text"].map((text, i) => (
                  <li key={i} className="text-gray-800 text-sm">
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Edit mode
  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden border-2 border-primary">
      <CardHeader className="bg-gray-50 p-3">
        <div className="flex justify-between items-center">
          <Input
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            className="font-bold text-purple-700"
            placeholder="Idea Title"
          />
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Concept</label>
          <Textarea
            value={editedConcept}
            onChange={(e) => setEditedConcept(e.target.value)}
            className="text-sm"
            placeholder="Concept description"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Background</label>
          <Input
            value={editedBackground}
            onChange={(e) => setEditedBackground(e.target.value)}
            className="text-sm"
            placeholder="Background description"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Effect</label>
          <Input
            value={editedEffect}
            onChange={(e) => setEditedEffect(e.target.value)}
            className="text-sm"
            placeholder="Effect description"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium">Main Text</label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddMainText}
              className="h-6 text-xs px-2"
            >
              Add Line
            </Button>
          </div>
          <div className="space-y-2">
            {editedMainTexts.map((text, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={text}
                  onChange={(e) => handleUpdateMainText(idx, e.target.value)}
                  className="text-sm"
                  placeholder={`Text line ${idx + 1}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveMainText(idx)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="px-3 py-2 bg-gray-50 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleCancelEdit}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSaveChanges}>
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
};

export default IdeaCard;
