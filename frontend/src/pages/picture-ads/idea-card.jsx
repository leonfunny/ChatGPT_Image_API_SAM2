import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const IdeaCard = ({ title, details }) => {
  return (
    <Card className={`hover:shadow-md transition-shadow overflow-hidden `}>
      <CardHeader className="bg-gray-50 p-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-md font-bold text-purple-700">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <p className="text-sm text-gray-600 italic mb-3">{details.Concept}</p>

        <div className="space-y-2 text-sm">
          <div className="flex">
            <span className="font-medium text-gray-700 min-w-20">
              Background:
            </span>
            <span className="text-gray-600">{details.Design.Background}</span>
          </div>
          <div className="flex">
            <span className="font-medium text-gray-700 min-w-20">Effect:</span>
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
};

export default IdeaCard;
