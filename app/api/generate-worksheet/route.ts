import OpenAI from "openai";
import { NextResponse } from "next/server";

const LEVELS = ["P1", "P2", "P3", "P4", "P5", "P6"];
const DIFFICULTIES = ["Foundation", "Standard", "Challenge"];
const OPERATIONS = ["Addition", "Subtraction", "Both"];
const MIN_QUESTION_COUNT = 5;
const MAX_QUESTION_COUNT = 20;
const QUESTIONS_PER_BATCH = 5;
const MAX_OUTPUT_TOKENS_PER_BATCH = 768;

type OperationChoice = (typeof OPERATIONS)[number];
type WorksheetQuestion = {
  question: string;
  answer: string;
};

function isOneOf<const T extends readonly string[]>(
  values: T,
  value: unknown
): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateQuestions(
  value: unknown,
  operationChoice: OperationChoice,
  questionCount: number
): WorksheetQuestion[] | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.questions) ||
    value.questions.length !== questionCount
  ) {
    return null;
  }

  const questions: WorksheetQuestion[] = [];

  for (const item of value.questions) {
    if (!isRecord(item) || typeof item.question !== "string" || typeof item.answer !== "string") {
      return null;
    }

    const match = item.question.match(/^\s*(\d+)\s*([+-])\s*(\d+)\s*=\s*\?\s*$/);
    if (!match) {
      return null;
    }

    const leftOperand = Number(match[1]);
    const operator = match[2];
    const rightOperand = Number(match[3]);
    const answerText = item.answer.trim();
    if (!/^-?\d+$/.test(answerText)) {
      return null;
    }
    const answer = Number(answerText);

    if (
      !Number.isSafeInteger(leftOperand) ||
      !Number.isSafeInteger(rightOperand) ||
      !Number.isSafeInteger(answer) ||
      (operationChoice === "Addition" && operator !== "+") ||
      (operationChoice === "Subtraction" && operator !== "-")
    ) {
      return null;
    }

    const expectedAnswer = operator === "+"
      ? leftOperand + rightOperand
      : leftOperand - rightOperand;

    if (!Number.isSafeInteger(expectedAnswer) || answer !== expectedAnswer) {
      return null;
    }

    questions.push({ question: item.question, answer: answerText });
  }

  return questions;
}

function logFailedAIResponse(
  reason: string,
  batchNumber: number,
  response: {
    choices: Array<{ finish_reason: string | null }>;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      completion_tokens_details?: { reasoning_tokens?: number } | null;
    } | null;
  }
) {
  console.warn("TutorMate AI response could not produce a valid worksheet", {
    reason,
    batchNumber,
    finishReason: response.choices[0]?.finish_reason ?? null,
    promptTokens: response.usage?.prompt_tokens ?? null,
    completionTokens: response.usage?.completion_tokens ?? null,
    reasoningTokens: response.usage?.completion_tokens_details?.reasoning_tokens ?? null,
  });
}

function getQuestionIdentity(question: string) {
  const match = question.match(/^\s*(\d+)\s*([+-])\s*(\d+)\s*=\s*\?\s*$/);
  return match ? `${Number(match[1])}${match[2]}${Number(match[3])}` : question.trim();
}

function getSafeErrorDetails(error: unknown) {
  if (!isRecord(error)) {
    return { errorType: "UnknownError" };
  }

  const errorType =
    typeof error.name === "string" && /^[A-Za-z0-9_]{1,64}$/.test(error.name)
      ? error.name
      : "UnknownError";
  const status =
    typeof error.status === "number" && Number.isInteger(error.status)
      ? error.status
      : undefined;
  const code =
    typeof error.code === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(error.code)
      ? error.code
      : undefined;

  return {
    errorType,
    ...(status === undefined ? {} : { status }),
    ...(code === undefined ? {} : { code }),
  };
}

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (
    !isRecord(input) ||
    !isOneOf(LEVELS, input.level) ||
    !isOneOf(OPERATIONS, input.operationChoice) ||
    !isOneOf(DIFFICULTIES, input.difficulty) ||
    typeof input.questionCount !== "number" ||
    !Number.isInteger(input.questionCount) ||
    input.questionCount < MIN_QUESTION_COUNT ||
    input.questionCount > MAX_QUESTION_COUNT
  ) {
    return NextResponse.json({ error: "Invalid worksheet options." }, { status: 400 });
  }

  const { level, operationChoice, difficulty, questionCount } = input;

  try {
    const client = new OpenAI({
      apiKey: process.env.NEBIUS_API_KEY,
      baseURL: "https://api.tokenfactory.nebius.com/v1/",
    });
    const questions: WorksheetQuestion[] = [];
    const questionIdentities = new Set<string>();
    let finishReason: string | null | undefined;

    for (let offset = 0; offset < questionCount; offset += QUESTIONS_PER_BATCH) {
      const batchNumber = Math.floor(offset / QUESTIONS_PER_BATCH) + 1;
      const batchQuestionCount = Math.min(QUESTIONS_PER_BATCH, questionCount - offset);
      const previousQuestions = questions.map(({ question }) => question);
      const response = await client.chat.completions.create({
        model: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
        messages: [
          {
            role: "user",
            content: `Generate exactly ${batchQuestionCount} different ${level} maths questions. Allowed operations: ${operationChoice}. If Both is selected, use addition and subtraction only. NEVER use multiplication or division. Difficulty: ${difficulty}. Foundation means easier revision, Standard means grade-appropriate, and Challenge means harder questions. For P4 Challenge, use mostly 4- to 5-digit numbers and include regrouping. Do not include reasoning or explanations. Return ONLY valid JSON in this format: {"questions":[{"question":"1234 + 5678 = ?","answer":"6912"}]}. Include exactly ${batchQuestionCount} objects. Do not repeat these questions: ${previousQuestions.join("; ") || "none"}.`,
          },
        ],
        max_tokens: MAX_OUTPUT_TOKENS_PER_BATCH,
        ...{ chat_template_kwargs: { enable_thinking: false } },
      });

      const completion = response.choices[0];
      finishReason = completion?.finish_reason;
      const content = completion?.message?.content;
      if (typeof content !== "string") {
        logFailedAIResponse(
          completion?.finish_reason === "length" ? "reasoning_or_output_truncated" : "missing_content",
          batchNumber,
          response
        );
        return NextResponse.json(
          { error: "The AI returned an incomplete worksheet. Please try again." },
          { status: 502 }
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        logFailedAIResponse("invalid_json", batchNumber, response);
        return NextResponse.json(
          { error: "The AI returned an unreadable worksheet. Please try again." },
          { status: 502 }
        );
      }

      const batchQuestions = validateQuestions(parsed, operationChoice, batchQuestionCount);
      if (!batchQuestions) {
        logFailedAIResponse("invalid_question_count_or_content", batchNumber, response);
        return NextResponse.json(
          { error: "The AI returned an invalid worksheet. Please try again." },
          { status: 502 }
        );
      }

      for (const question of batchQuestions) {
        const identity = getQuestionIdentity(question.question);
        if (questionIdentities.has(identity)) {
          logFailedAIResponse("duplicate_question", batchNumber, response);
          return NextResponse.json(
            { error: "The AI returned a duplicate question. Please try again." },
            { status: 502 }
          );
        }
        questionIdentities.add(identity);
        questions.push(question);
      }
    }

    return NextResponse.json({
      questions,
      finishReason,
    });
  } catch (error) {
    console.error("TutorMate Nebius API request failed", getSafeErrorDetails(error));
    return NextResponse.json(
      { error: "AI generation failed" },
      { status: 500 }
    );
  }
}