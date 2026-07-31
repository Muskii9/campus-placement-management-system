import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEPARTMENTS = [
  { name: "Computer Science & Engineering", code: "CSE" },
  { name: "Electronics & Communication", code: "ECE" },
  { name: "Mechanical Engineering", code: "ME" },
  { name: "Civil Engineering", code: "CE" },
  { name: "Electrical Engineering", code: "EE" },
  { name: "Master of Computer Applications", code: "MCA" },
];

const COMPANY_NAMES = [
  "Infosys", "TCS", "Wipro", "Accenture", "Cognizant",
  "Amazon", "Microsoft", "Google", "Deloitte", "Capgemini",
];

const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan",
  "Krishna", "Ishaan", "Ananya", "Diya", "Saanvi", "Aadhya", "Pari", "Riya",
  "Sriya", "Kavya", "Anika", "Navya", "Rohan", "Karan", "Neha", "Priya",
  "Shreya", "Tanya", "Rahul", "Amit", "Sneha", "Pooja",
];

const LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Patel", "Reddy", "Nair", "Iyer", "Singh",
  "Kumar", "Rao", "Das", "Bose", "Jain", "Mehta", "Agarwal",
];

const SKILLS_POOL = [
  "Java", "Python", "C++", "JavaScript", "React", "Node.js", "SQL",
  "Machine Learning", "Data Structures", "AWS", "Docker", "Git",
];

function rand(seed: number): number {
  const x = Math.sin(seed * 9999 + 1) * 10000;
  return x - Math.floor(x);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(rand(seed) * arr.length)];
}

function randomSkills(seed: number): string {
  const count = 3 + Math.floor(rand(seed) * 4);
  const skills: string[] = [];
  for (let i = 0; i < count; i++) {
    const s = pick(SKILLS_POOL, seed * 7 + i * 13);
    if (!skills.includes(s)) skills.push(s);
  }
  return skills.join(", ");
}

async function createUser(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) {
    // User might already exist
    if (error.message.includes("already been registered") || error.message.includes("already exists")) {
      const { data: existing } = await supabase.auth.admin.listUsers();
      const user = existing?.users?.find((u) => u.email === email);
      return user?.id ?? null;
    }
    throw error;
  }
  return data.user.id;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const results: string[] = [];

    // 1. Seed departments
    const deptIds: Record<string, string> = {};
    for (const dept of DEPARTMENTS) {
      const { data: existing } = await supabase
        .from("departments")
        .select("id")
        .eq("code", dept.code)
        .maybeSingle();
      if (existing) {
        deptIds[dept.code] = existing.id;
      } else {
        const { data: inserted, error } = await supabase
          .from("departments")
          .insert({ name: dept.name, code: dept.code })
          .select("id")
          .single();
        if (error) throw error;
        deptIds[dept.code] = inserted.id;
      }
    }
    results.push("Departments: 6");

    // 2. Create admin user
    const adminEmail = "admin@cpms.edu";
    let adminId = await createUser(adminEmail, "admin123", "Placement Admin");
    if (!adminId) throw new Error("Failed to create admin");
    await supabase.from("user_profiles").upsert({
      user_id: adminId, role: "admin", email: adminEmail, full_name: "Placement Admin",
    });
    await supabase.from("admins").upsert({
      id: adminId, name: "Placement Admin", email: adminEmail, phone: "9876543210",
    });
    results.push("Admin created");

    // 3. Create 10 companies
    const companyIds: string[] = [];
    for (let i = 0; i < COMPANY_NAMES.length; i++) {
      const name = COMPANY_NAMES[i];
      const email = `company${i + 1}@cpms.com`;
      const id = await createUser(email, "company123", name);
      if (!id) throw new Error(`Failed to create company ${name}`);
      companyIds.push(id);
      await supabase.from("user_profiles").upsert({
        user_id: id, role: "company", email, full_name: name,
      });
      await supabase.from("companies").upsert({
        id, name, email, contact_person: `HR ${name}`,
        contact_phone: `98000000${String(i).padStart(2, "0")}`,
        website: `www.${name.toLowerCase()}.com`,
        description: `${name} is a leading technology company hiring top talent.`,
      });
    }
    results.push("Companies: 10");

    // 4. Create 50 students
    const studentIds: string[] = [];
    const deptCodes = Object.keys(deptIds);
    for (let i = 0; i < 50; i++) {
      const firstName = pick(FIRST_NAMES, i + 1);
      const lastName = pick(LAST_NAMES, i * 3 + 7);
      const name = `${firstName} ${lastName}`;
      const email = `student${i + 1}@cpms.edu`;
      const id = await createUser(email, "student123", name);
      if (!id) throw new Error(`Failed to create student ${i + 1}`);
      studentIds.push(id);

      const deptCode = deptCodes[i % deptCodes.length];
      const cgpa = Math.round((6.5 + rand(i + 100) * 3.4) * 100) / 100;
      const tenth = Math.round((65 + rand(i + 200) * 34) * 100) / 100;
      const twelfth = Math.round((65 + rand(i + 300) * 34) * 100) / 100;

      await supabase.from("user_profiles").upsert({
        user_id: id, role: "student", email, full_name: name,
      });
      await supabase.from("students").upsert({
        id,
        roll_no: `2021${deptCode}${String(i + 1).padStart(3, "0")}`,
        name,
        email,
        phone: `98765${String(1000 + i).padStart(4, "0")}`,
        department_id: deptIds[deptCode],
        year_of_study: 4,
        tenth_percentage: tenth,
        twelfth_percentage: twelfth,
        cgpa,
        skills: randomSkills(i + 1),
      });
      await supabase.from("resumes").upsert({
        student_id: id,
        file_name: `${firstName}_${lastName}_Resume.pdf`,
        file_data: "demo resume content",
      });
    }
    results.push("Students: 50");

    // 5. Create 20 placement drives (2 per company)
    const driveIds: string[] = [];
    const today = new Date();
    for (let i = 0; i < 20; i++) {
      const companyIdx = i % 10;
      const companyId = companyIds[companyIdx];
      const driveDate = new Date(today);
      driveDate.setDate(today.getDate() + 10 + i * 5);
      const lastDate = new Date(today);
      lastDate.setDate(today.getDate() + 5 + i * 2);

      const { data: drive, error } = await supabase
        .from("placement_drives")
        .insert({
          company_id: companyId,
          title: `${COMPANY_NAMES[companyIdx]} Drive ${Math.floor(i / 10) + 1}`,
          description: `Placement drive by ${COMPANY_NAMES[companyIdx]} for final year students.`,
          drive_date: driveDate.toISOString().split("T")[0],
          last_date_to_apply: lastDate.toISOString().split("T")[0],
          status: i < 14 ? "open" : i < 18 ? "closed" : "completed",
        })
        .select("id")
        .single();
      if (error) throw error;
      driveIds.push(drive.id);
    }
    results.push("Drives: 20");

    // 6. Create job posts (2 per drive = 40 jobs)
    const jobIds: string[] = [];
    const jobTitles = [
      "Software Engineer", "Data Analyst", "Backend Developer", "Frontend Developer",
      "Full Stack Developer", "DevOps Engineer", "QA Engineer", "Cloud Engineer",
    ];
    const deptAllCodes = deptCodes.join(",");

    for (let i = 0; i < 20; i++) {
      const companyIdx = i % 10;
      const companyId = companyIds[companyIdx];
      for (let j = 0; j < 2; j++) {
        const title = jobTitles[(i * 2 + j) % jobTitles.length];
        const ctc = Math.round((3 + rand(i * 10 + j) * 41) * 100000) / 100;
        const minCgpa = Math.round((6 + rand(i + j) * 2) * 100) / 100;
        const eligibleDepts = rand(i + j) > 0.4 ? deptAllCodes : deptAllCodes;

        const { data: job, error } = await supabase
          .from("job_posts")
          .insert({
            drive_id: driveIds[i],
            company_id: companyId,
            title,
            description: `Role for ${title} at ${COMPANY_NAMES[companyIdx]}.`,
            package_ctc: ctc,
            job_location: pick(["Bangalore", "Hyderabad", "Pune", "Chennai", "Mumbai", "Delhi"], i + j),
            job_type: "Full-time",
            min_cgpa: minCgpa,
            eligible_departments: eligibleDepts,
            no_of_vacancies: 2 + Math.floor(rand(i + j) * 8),
          })
          .select("id")
          .single();
        if (error) throw error;
        jobIds.push(job.id);
      }
    }
    results.push("Job Posts: 40");

    // 7. Create applications (students apply to jobs)
    let appCount = 0;
    const applicationIds: string[] = [];
    for (let i = 0; i < jobIds.length; i++) {
      const jobId = jobIds[i];
      // Each job gets 5-12 applicants
      const numApps = 5 + Math.floor(rand(i + 1) * 8);
      for (let j = 0; j < numApps && j < 50; j++) {
        const studentIdx = Math.floor(rand(i * 50 + j * 7) * 50);
        const studentId = studentIds[studentIdx];
        if (!studentId) continue;

        const statusRoll = rand(i * 100 + j);
        let status = "pending";
        if (statusRoll > 0.7) status = "shortlisted";
        if (statusRoll > 0.88) status = "selected";
        if (statusRoll < 0.15) status = "rejected";

        const { data: app, error } = await supabase
          .from("applications")
          .upsert({
            student_id: studentId,
            job_post_id: jobId,
            status,
          }, { onConflict: "student_id,job_post_id" })
          .select("id")
          .single();
        if (error) continue;
        applicationIds.push(app.id);
        appCount++;
      }
    }
    results.push(`Applications: ${appCount}`);

    // 8. Create interviews for shortlisted/selected students
    let intCount = 0;
    for (let i = 0; i < applicationIds.length; i++) {
      const appId = applicationIds[i];
      // Get application details
      const { data: app } = await supabase
        .from("applications")
        .select("student_id, job_post_id, status")
        .eq("id", appId)
        .maybeSingle();
      if (!app || (app.status !== "shortlisted" && app.status !== "selected")) continue;

      const { data: job } = await supabase
        .from("job_posts")
        .select("company_id")
        .eq("id", app.job_post_id)
        .maybeSingle();
      if (!job) continue;

      const intDate = new Date(today);
      intDate.setDate(today.getDate() + 7 + i);
      const { error } = await supabase.from("interviews").upsert({
        application_id: appId,
        student_id: app.student_id,
        company_id: job.company_id,
        job_post_id: app.job_post_id,
        scheduled_at: intDate.toISOString(),
        venue: pick(["Auditorium A", "Seminar Hall B", "Placement Cell", "Online"], i),
        round: pick(["Technical", "HR", "Managerial", "Coding"], i),
        status: app.status === "selected" ? "completed" : "scheduled",
      });
      if (!error) intCount++;
    }
    results.push(`Interviews: ${intCount}`);

    // 9. Create selected_students for selected applications
    let selCount = 0;
    for (let i = 0; i < applicationIds.length; i++) {
      const appId = applicationIds[i];
      const { data: app } = await supabase
        .from("applications")
        .select("student_id, job_post_id, status")
        .eq("id", appId)
        .maybeSingle();
      if (!app || app.status !== "selected") continue;

      const { data: job } = await supabase
        .from("job_posts")
        .select("company_id, package_ctc")
        .eq("id", app.job_post_id)
        .maybeSingle();
      if (!job) continue;

      const { error } = await supabase.from("selected_students").upsert({
        student_id: app.student_id,
        company_id: job.company_id,
        job_post_id: app.job_post_id,
        package_ctc: job.package_ctc,
      }, { onConflict: "student_id,company_id,job_post_id" });
      if (!error) selCount++;
    }
    results.push(`Selected: ${selCount}`);

    return new Response(JSON.stringify({
      success: true,
      message: "Demo data seeded successfully",
      details: results,
      credentials: {
        admin: { email: "admin@cpms.edu", password: "admin123" },
        company: { email: "company1@cpms.com", password: "company123" },
        student: { email: "student1@cpms.edu", password: "student123" },
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});