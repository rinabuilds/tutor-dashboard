# TutorMate

TutorMate helps tutors manage student records, track lessons and assessment results, and prepare maths practice in one dashboard.

## Live demo

[Open TutorMate](https://tutor-dashboard-eta.vercel.app)

Authentication is required. Sign in using a configured Supabase account. The current app does not include a public sign-up page. Demo student records are fictional.

## Features

- Student profiles, subjects, learning levels, and notes.
- Lesson history, progress ratings, homework, points, and payment status.
- Assessment marks and grade history.
- Maths worksheets for Primary 1–6 with selectable operations, difficulty, and question count.
- Printable worksheets and an optional answer key.

## NVIDIA and Nebius integration

The worksheet generator calls **NVIDIA Nemotron through Nebius Token Factory**.

- **Model:** `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`
- **Endpoint:** `https://api.tokenfactory.nebius.com/v1/`
- **Implementation:** [Worksheet API route](app/api/generate-worksheet/route.ts)

The authenticated server route sends the chosen level, operations, difficulty, and question count to the model. It validates the returned JSON, arithmetic answers, question count, and duplicate equations.

Duplicate model output may trigger a deterministic backup generator. The interface displays a notice when that backup is used.

The generation prompt does not send student names, birthdays, or lesson notes. The Nebius API key stays on the server.

## Technology

Next.js, React, TypeScript, Supabase authentication/database, Nebius Token Factory, NVIDIA Nemotron, and Vercel hosting.

## Local setup

Requires Node.js, npm, a Nebius API key with access to the configured model, and a provisioned Supabase project with a sign-in account.

```bash
git clone https://github.com/rinabuilds/tutor-dashboard.git
cd tutor-dashboard
npm ci
```

Create `.env.local` in the project root:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_KEY=your_supabase_public_client_key
NEBIUS_API_KEY=your_nebius_api_key
```

Keep this file out of version control. Use a Supabase publishable or anon key for the public client key, not a service-role secret.

The dashboard requires Supabase tables named `students`, `sessions`, `grades`, and `point_events`, with the columns referenced by the dashboard pages. Database migrations and security policies are not bundled in this repository yet, so a fresh database needs provisioning. The hosted demo uses an existing configured database.

Start the app:

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000), sign in, and select **Create Worksheet**.

Other available commands:

```bash
npm run lint
npm run build
npm start
```

## License

[MIT License](LICENSE)

Copyright (c) 2026 Arina Aizin.
