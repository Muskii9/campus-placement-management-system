# Campus Placement Management System

A web app to manage campus placement activity in one place: students, companies, job postings, applications, and placement outcomes.

**Live demo:** https://campus-placement-management-system-rho.vercel.app


## Features

- Student profiles and placement status tracking
- Company and job posting management
- Application tracking (applied, shortlisted, selected, rejected)
- Placement statistics and reports
- Role-based access (e.g. student / admin)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend / Database | Supabase (PostgreSQL) |
| Deployment | Vercel |
| Tooling | ESLint |

## Database Design

```mermaid
erDiagram
    STUDENTS {
        uuid id PK
        text name
        text email
        text branch
        numeric cgpa
        int graduation_year
    }
    COMPANIES {
        uuid id PK
        text name
        text industry
        text location
    }
    JOBS {
        uuid id PK
        uuid company_id FK
        text title
        numeric package_lpa
        numeric min_cgpa
        date deadline
    }
    APPLICATIONS {
        uuid id PK
        uuid student_id FK
        uuid job_id FK
        text status
        date applied_on
    }
    PLACEMENTS {
        uuid id PK
        uuid application_id FK
        date offer_date
        numeric final_package_lpa
    }

    STUDENTS ||--o{ APPLICATIONS : submits
    JOBS ||--o{ APPLICATIONS : receives
    COMPANIES ||--o{ JOBS : posts
    APPLICATIONS ||--o| PLACEMENTS : results_in
```



Schema and migrations live in the [`supabase/`](./supabase) folder.

## Getting Started

**Prerequisites:** Node.js 18+ and a free [Supabase](https://supabase.com) project.

```bash
# 1. Clone
git clone https://github.com/Muskii9/campus-placement-management-system.git
cd campus-placement-management-system

# 2. Install dependencies
npm install

# 3. Set environment variables (create a .env file in the root)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 4. Apply the schema from supabase/ to your Supabase project

# 5. Run locally
npm run dev
```

> Never commit your `.env` file. It is listed in `.gitignore`.

## Project Structure

```
├── src/         # React components, pages, and app logic
├── supabase/    # Database schema and migrations
├── index.html
└── vite.config.ts
```

## Future Improvements

- Email notifications for new job postings
- Resume upload and shortlisting filters
- Analytics dashboard for placement trends

## Author

**Muskan Gupta**
[GitHub](https://github.com/Muskii9) · [LinkedIn](https://www.linkedin.com/in/muskan-gupta-385a0b298/)
