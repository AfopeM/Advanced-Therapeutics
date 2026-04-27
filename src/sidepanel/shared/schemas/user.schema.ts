import { z } from "zod";

export const UserSchema = z.object({
  name: z.string().min(1),
});

export type User = z.infer<typeof UserSchema>;
