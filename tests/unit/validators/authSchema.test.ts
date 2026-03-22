import { describe, it, expect } from "vitest";
import { passwordSchema, resetPasswordSchema } from "@/validators/authSchema";

describe("authSchema validators", () => {
    describe("passwordSchema", () => {
        it("should accept valid passwords", () => {
            const result = passwordSchema.safeParse("ValidPass123");
            expect(result.success).toBe(true);
        });

        it("should reject passwords shorter than 8 characters", () => {
            const result = passwordSchema.safeParse("Short1");
            expect(result.success).toBe(false);
            if (result.success) return; // TS narrowing
            expect(result.error!.issues[0]!.message).toBe("Password must be at least 8 characters");
        });

        it("should reject passwords without uppercase letters", () => {
            const result = passwordSchema.safeParse("lowercase123");
            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.error!.issues[0]!.message).toBe("Password must contain at least one uppercase letter");
        });

        it("should reject passwords without lowercase letters", () => {
            const result = passwordSchema.safeParse("UPPERCASE123");
            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.error!.issues[0]!.message).toBe("Password must contain at least one lowercase letter");
        });

        it("should reject passwords without numbers", () => {
            const result = passwordSchema.safeParse("NoNumbersHere");
            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.error!.issues[0]!.message).toBe("Password must contain at least one number");
        });
    });

    describe("resetPasswordSchema", () => {
        it("should accept matching passwords", () => {
            const result = resetPasswordSchema.safeParse({
                password: "ValidPass123",
                confirmPassword: "ValidPass123",
            });
            expect(result.success).toBe(true);
        });

        it("should reject non-matching passwords", () => {
            const result = resetPasswordSchema.safeParse({
                password: "ValidPass123",
                confirmPassword: "DifferentPass123",
            });
            expect(result.success).toBe(false);
            if (result.success) return;
            expect(result.error!.issues[0]!.message).toBe("Passwords don't match");
            expect(result.error!.issues[0]!.path).toEqual(["confirmPassword"]);
        });

        it("should validate the primary password against passwordSchema rules", () => {
            const result = resetPasswordSchema.safeParse({
                password: "short",
                confirmPassword: "short",
            });
            expect(result.success).toBe(false);
            if (result.success) return;
            // Check for the specific password-length error in the first issue
            expect(result.error!.issues[0]!.path).toContain("password");
            expect(result.error!.issues[0]!.message).toBe("Password must be at least 8 characters");
        });
    });
});
