"use client";
import "./worksheet.css";
import { useState } from "react";

const LEVELS = ["P1", "P2", "P3", "P4", "P5", "P6"];
const MIN_QUESTION_COUNT = 5;
const MAX_QUESTION_COUNT = 20;
const QUESTIONS_PER_PAGE = 5;
type WorksheetQuestion = {
  question: string;
  answer: string;
};

function isWorksheetQuestion(value: unknown): value is WorksheetQuestion {
  return (
    typeof value === "object" &&
    value !== null &&
    "question" in value &&
    typeof value.question === "string" &&
    "answer" in value &&
    typeof value.answer === "string"
  );
}

export default function WorksheetsPage() {
  const [level, setLevel] = useState("P1");
  const [operationChoice, setOperationChoice] = useState("Addition");
  const [difficulty, setDifficulty] = useState("Standard");
  const [questionCount, setQuestionCount] = useState(MIN_QUESTION_COUNT);
  const [questions, setQuestions] = useState<WorksheetQuestion[]>([]);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const questionPages = Array.from(
    { length: Math.ceil(questions.length / QUESTIONS_PER_PAGE) },
    (_, pageIndex) =>
      questions.slice(
        pageIndex * QUESTIONS_PER_PAGE,
        (pageIndex + 1) * QUESTIONS_PER_PAGE
      )
  );

  async function handleGenerate() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/generate-worksheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, operationChoice, difficulty, questionCount }),
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Worksheet generation failed. Please try again.";
        throw new Error(message);
      }

      if (
        typeof data !== "object" ||
        data === null ||
        !("questions" in data) ||
        !Array.isArray(data.questions) ||
        data.questions.length !== questionCount ||
        !data.questions.every(isWorksheetQuestion)
      ) {
        throw new Error("The server returned an incomplete worksheet. Please try again.");
      }

      setQuestions(data.questions);
    } catch (generationError) {
      setQuestions([]);
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Worksheet generation failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="worksheet-page">
      <section className="worksheet-builder" aria-labelledby="builder-title">
        <div className="builder-heading">
          <p className="eyebrow">A little practice goes a long way</p>
          <h1 id="builder-title">Let&apos;s make a worksheet</h1>
          <p className="builder-intro">
            Choose a level, style, and number of questions for your practice sheet.
          </p>
        </div>

        <div className="builder-options">
          <fieldset className="option-group">
            <legend>Student&apos;s level</legend>
            <div className="option-list">
              {LEVELS.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`option-button${level === item ? " is-selected" : ""}`}
                  aria-pressed={level === item}
                  onClick={() => setLevel(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="option-group">
            <legend>Topic</legend>
            <div className="option-list">
              {["Addition", "Subtraction", "Both"].map((operation) => (
                <button
                  type="button"
                  key={operation}
                  className={`option-button${operationChoice === operation ? " is-selected" : ""}`}
                  aria-pressed={operationChoice === operation}
                  onClick={() => setOperationChoice(operation)}
                >
                  {operation}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="option-group">
            <legend>Difficulty</legend>
            <div className="option-list">
              {["Foundation", "Standard", "Challenge"].map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`option-button${difficulty === item ? " is-selected" : ""}`}
                  aria-pressed={difficulty === item}
                  onClick={() => setDifficulty(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="option-group question-count-group">
            <legend>
              Number of questions: <strong>{questionCount}</strong>
            </legend>
            <input
              id="question-count"
              className="question-count-slider"
              type="range"
              aria-label="Number of questions"
              min={MIN_QUESTION_COUNT}
              max={MAX_QUESTION_COUNT}
              step="1"
              value={questionCount}
              aria-valuetext={`${questionCount} questions`}
              onChange={(event) => setQuestionCount(Number(event.target.value))}
            />
            <div className="slider-labels" aria-hidden="true">
              <span>{MIN_QUESTION_COUNT}</span>
              <span>{MAX_QUESTION_COUNT}</span>
            </div>
          </fieldset>
        </div>

        <div className="builder-actions">
          <button
            type="button"
            className="primary-button"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? "Making your worksheet..." : "Generate my worksheet"}
            <span aria-hidden="true">{loading ? "…" : " ✨"}</span>
          </button>
          {error && (
            <p className="worksheet-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </section>

      {questions.length > 0 && (
        <>
          <section className="worksheet-preview" aria-label="Worksheet preview">
            <div className="preview-heading">
              <div>
                <p className="eyebrow">Ready when you are</p>
                <h2>Your worksheet</h2>
              </div>
              <div className="worksheet-actions">
                <button
                  type="button"
                  className="secondary-button"
                  aria-expanded={answerVisible}
                  aria-controls="worksheet-answer-key"
                  onClick={() => setAnswerVisible(!answerVisible)}
                >
                  {answerVisible ? "Hide answer key" : "Show answer key"}{" "}
                  <span aria-hidden="true">🗝️</span>
                </button>
                <button
                  type="button"
                  className="primary-button print-button"
                  onClick={() => window.print()}
                >
                  Print worksheet <span aria-hidden="true">🖨️</span>
                </button>
              </div>
            </div>

            <div className="worksheet-print-pages">
              {questionPages.map((pageQuestions, pageIndex) => (
                <article
                  className={`worksheet-print${pageIndex === questionPages.length - 1 ? " is-last-page" : ""}`}
                  aria-label={`TutorMate student worksheet, page ${pageIndex + 1} of ${questionPages.length}`}
                  key={pageIndex}
                >
                  <header className="print-header">
                    <div className="print-title-row">
                      <div>
                        <p className="print-kicker">A little practice, a lot of progress</p>
                        <h2>TutorMate</h2>
                        <p className="print-subtitle">My maths practice sheet</p>
                      </div>
                      <div className="score-box" aria-label="Score">
                        <span>My score</span>
                        <strong>____ / {questions.length}</strong>
                      </div>
                    </div>

                    <div className="student-fields">
                      <div className="student-field">
                        <span>Name</span>
                        <i aria-hidden="true" />
                      </div>
                      <div className="student-field date-field">
                        <span>Date</span>
                        <i aria-hidden="true" />
                      </div>
                    </div>

                    <div className="worksheet-meta">
                      <span>
                        <strong>Level</strong> {level}
                      </span>
                      <span>
                        <strong>Topic</strong> {operationChoice}
                      </span>
                      <span>
                        <strong>Practice</strong> {difficulty}
                      </span>
                      <span>
                        <strong>Page</strong> {pageIndex + 1} of {questionPages.length}
                      </span>
                    </div>
                  </header>

                  <div className="questions-heading">
                    <h3>Let&apos;s practise!</h3>
                    <span>Take your time and show your working.</span>
                  </div>
                  <ol className="worksheet-question-list">
                    {pageQuestions.map((question, questionIndex) => (
                      <li className="worksheet-question" key={questionIndex}>
                        <div className="question-prompt">
                          <span className="question-number">
                            {pageIndex * QUESTIONS_PER_PAGE + questionIndex + 1}
                          </span>
                          <span>{question.question}</span>
                        </div>
                        <div className="question-workspace" aria-hidden="true">
                          <i />
                          <i />
                        </div>
                      </li>
                    ))}
                  </ol>

                  <footer className="worksheet-footer">
                    <span>You&apos;ve got this! Keep trying your best.</span>
                    <span className="footer-flourish" aria-hidden="true">✦</span>
                  </footer>
                </article>
              ))}
            </div>
          </section>

          {answerVisible && (
            <section
              className="answer-key"
              id="worksheet-answer-key"
              aria-labelledby="answer-key-title"
            >
              <h2 id="answer-key-title">
                Answer key <span aria-hidden="true">🗝️</span>
              </h2>
              <ol>
                {questions.map((question, index) => (
                  <li key={index}>{question.answer}</li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </main>
  );
}
