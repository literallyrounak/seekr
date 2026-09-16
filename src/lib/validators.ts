import { z } from 'zod'

export const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(100, 'Event name must be 100 characters or less'),
  max_players: z.number().int().min(2).max(100).default(40),
  answer_time_seconds: z.number().int().min(30).max(600).default(120),
  discovery_time_seconds: z.number().int().min(60).max(1800).default(300),
  questions: z.array(z.object({
    text: z.string().min(1).max(300)
  })).min(1).max(10).optional()
})

export const joinEventSchema = z.object({
  username: z.string()
    .min(1, 'Username is required')
    .max(30, 'Username must be 30 characters or less')
    .regex(/^[a-zA-Z0-9_\-\s]+$/, 'Username can only contain letters, numbers, spaces, underscores, and hyphens')
})

export const submitAnswersSchema = z.object({
  answers: z.array(z.object({
    question_index: z.number().int().min(0),
    answer_text: z.string().min(1, 'Answer cannot be empty').max(500, 'Answer must be 500 characters or less')
  })).min(1, 'At least one answer is required')
})

export const submitGuessSchema = z.object({
  guessed_username: z.string().min(1, 'Username guess is required').max(30)
})

export type CreateEventInput = z.infer<typeof createEventSchema>
export type JoinEventInput = z.infer<typeof joinEventSchema>
export type SubmitAnswersInput = z.infer<typeof submitAnswersSchema>
export type SubmitGuessInput = z.infer<typeof submitGuessSchema>
