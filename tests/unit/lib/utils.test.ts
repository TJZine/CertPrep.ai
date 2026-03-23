import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("utils", () => {
    describe("cn", () => {
        it("should merge basic class names", () => {
            expect(cn("class1", "class2")).toBe("class1 class2");
        });

        it("should handle conditional class names", () => {
            expect(cn("class1", true && "class2", false && "class3")).toBe("class1 class2");
        });

        it("should merge tailwind classes properly overriding when needed", () => {
            expect(cn("p-4 bg-red-500", "p-8")).toBe("bg-red-500 p-8");
            expect(cn("text-sm", "text-lg")).toBe("text-lg");
        });
    });
});
