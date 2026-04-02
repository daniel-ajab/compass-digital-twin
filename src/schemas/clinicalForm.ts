import { z } from "zod";

export const clinicalFormSchema = z.object({
  psa: z.coerce.number().nonnegative(),
  vol: z.coerce.number().positive(),
  gg: z.coerce.number().int().min(0).max(5),
  cores: z.coerce.number().int().min(0),
  maxcore: z.coerce.number().min(0).max(100),
  decipherStr: z.string().optional(),
  psma_ln: z.coerce.boolean().default(false),
});

export type ClinicalFormValues = z.infer<typeof clinicalFormSchema>;
