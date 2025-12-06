"use client";
import * as React from "react";
import { sanitizeHTML } from "@/lib/sanitize";

export interface ReviewItem {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation?: string;
}

export interface QuestionReviewProps {
  items: ReviewItem[];
}

/**
 * Question-by-question review placeholder.
 */
export function QuestionReview({
  items,
}: QuestionReviewProps): React.ReactElement {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div
          key={item.question}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="text-sm font-semibold text-slate-900">
            Question {index + 1}
          </div>
          <div
            className="prose mt-2 max-w-none text-slate-800"
            dangerouslySetInnerHTML={{ __html: sanitizeHTML(item.question) }}
          />
          <div className="mt-2 text-sm text-slate-700">
            Your answer: {item.userAnswer}
          </div>
          <div className="text-sm text-green-700">
            Correct answer: {item.correctAnswer}
          </div>
          {item.explanation ? (
            <div
              className="prose mt-2 max-w-none text-slate-700"
              dangerouslySetInnerHTML={{
                __html: sanitizeHTML(item.explanation),
              }}
            />
          ) : null}
        </div>
      ))}
      {items.length === 0 ? (
        <div className="text-sm text-slate-500">No review data yet.</div>
      ) : null}
    </div>
  );
}

export default QuestionReview;
