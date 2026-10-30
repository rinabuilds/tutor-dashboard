import OpenAI from "openai";
import { NextResponse } from "next/server";

const LEVELS = ["P1", "P2", "P3", "P4", "P5", "P6"];
const DIFFICULTIES = ["Foundation", "Standard", "Challenge"];
const OPERATIONS = ["Addition", "Subtraction", "Both"];

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
  operationChoice: OperationChoice
): WorksheetQuestion[] | null {
  if (!isRecord(value) || !Array.isArray(value.questions) || value.questions.length !== 5) {
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
    !isOneOf(DIFFICULTIES, input.difficulty)
  ) {
    return NextResponse.json({ error: "Invalid worksheet options." }, { status: 400 });
  }

  const { level, operationChoice, difficulty } = input;

  try {
    const client = new OpenAI({
      apiKey: process.env.NEBIUS_API_KEY,
      baseURL: "https://api.tokenfactory.nebius.com/v1/",
    });
    const response = await client.chat.completions.create({
      model: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
      messages: [
        {
          role: "user",
content: `Generate exactly 5 different ${level} maths questions. Allowed operations: ${operationChoice}. If Both is selected, use addition and subtraction only. NEVER use multiplication or division. Difficulty: ${difficulty}. Foundation means easier revision, Standard means grade-appropriate, and Challenge means harder questions. For P4 Challenge, use mostly 4- to 5-digit numbers and include regrouping. Return ONLY valid JSON in this format: {"questions":[{"question":"1234 + 5678 = ?","answer":"6912"}]}. Include exactly 5 objects. No markdown or explanations.`,
        },
      ],
      max_tokens: 3000,
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content !== "string") {
      return NextResponse.json(
        { error: "The AI returned an incomplete worksheet. Please try again." },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "The AI returned an unreadable worksheet. Please try again." },
        { status: 502 }
      );
    }

    const questions = validateQuestions(parsed, operationChoice);
    if (!questions) {
      return NextResponse.json(
        { error: "The AI returned an invalid worksheet. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      questions,
      finishReason: response.choices[0]?.finish_reason,
    });
  } catch (error) {
    console.error("Nebius API error:", error);
    return NextResponse.json(
      { error: "AI generation failed" },
      { status: 500 }
    );
  }
}