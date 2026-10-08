import { installStorageStub } from "./helpers/storage-stub";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";
const db = new PGlite();
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const school = id(1),
  foreign = id(2),
  admin = id(3),
  teacher = id(4),
  student = id(5),
  guardian = id(6),
  outsider = id(7),
  lateUser = id(8),
  idle = id(9);
const year = id(10),
  grade = id(11),
  classroom = id(12),
  secondClass = id(13),
  subject = id(14),
  teacherRecord = id(15),
  learner = id(16),
  lateLearner = id(17),
  guardianRecord = id(18),
  enrollment = id(19),
  assignment = id(20),
  foreignAssignment = id(40);
let today: string, yesterday: string;
async function user(who: string) {
  await db.exec("set local role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [who]);
}
async function owner() {
  await db.exec("reset role");
}
async function save(options: { id?: string; version?: number; status?: string; mode?: string; classId?: string | null; title?: string; body?: string; school?: string } = {}) {
  return (await db.query<{id:string}>("select save_announcement($1,$2,$3,$4,$5,$6,$7,$8) id",[
    options.school ?? school, options.mode ?? "teacher", options.id ?? null,
    options.classId === undefined ? classroom : options.classId, options.version ?? 0,
    options.title ?? "Fictional notice", options.body ?? "Bring a notebook.", options.status ?? "draft"
  ])).rows[0].id;
}
async function list(mode = "student", child: string | null = null, page = 1, target: string | null = null) {
  return (await db.query<{id:string;status:string;record_version:number;can_edit:boolean}>(
    "select * from list_announcements($1,$2,$3,$4,$5)",[school,mode,child,page,target])).rows;
}
async function rejection(fn: () => Promise<unknown>, code: string) {
  await db.exec("savepoint rejected_call");
  await expect(fn()).rejects.toMatchObject({ code });
  await db.exec(
    "rollback to savepoint rejected_call; release savepoint rejected_call",
  );
}
beforeAll(async () => {
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth; create table auth.users(id uuid primary key,email varchar(255),email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to authenticated,anon;`);
  await installStorageStub(db);
  for (const file of readdirSync("supabase/migrations").sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.query(
    "insert into schools(id,name,timezone) values($1,'Fictional A','Africa/Johannesburg'),($2,'Fictional B','UTC')",
    [school, foreign],
  );
  for (const [who, role, where] of [
    [admin, "school_admin", school],
    [teacher, "teacher", school],
    [student, "student", school],
    [guardian, "guardian", school],
    [outsider, "school_admin", foreign],
    [lateUser, "student", school],
    [idle, "teacher", school],
  ]) {
    await db.query("insert into auth.users(id) values($1)", [who]);
    await db.query("insert into profiles(user_id) values($1)", [who]);
    await db.query(
      "insert into school_memberships(id,user_id,school_id) values($1,$1,$2)",
      [who, where],
    );
    await db.query("insert into membership_roles values($1,$2,$3)", [
      who,
      where,
      role,
    ]);
  }
  const dates = (
    await db.query<{ today: string; yesterday: string; due: string }>(
      "select private.school_today($1)::text today,(private.school_today($1)-1)::text yesterday,(private.school_today($1)+7)::text due",
      [school],
    )
  ).rows[0];
  ({ today, yesterday } = dates);
  await db.query(
    "insert into academic_years(id,school_id,name,starts_on,ends_on) values($1,$2,'Fictional year',current_date-370,current_date+370),($3,$4,'Other year',current_date-370,current_date+370)",
    [year, school, id(30), foreign],
  );
  await db.query(
    "insert into grades(id,school_id,name) values($1,$2,'Grade 8'),($3,$4,'Grade 8')",
    [grade, school, id(31), foreign],
  );
  await db.query(
    "insert into classes(id,school_id,name,academic_year_id,grade_id) values($1,$2,'8A',$3,$4),($5,$2,'8B',$3,$4),($6,$7,'8A',$8,$9)",
    [
      classroom,
      school,
      year,
      grade,
      secondClass,
      id(32),
      foreign,
      id(30),
      id(31),
    ],
  );
  await db.query(
    "insert into subjects(id,school_id,name) values($1,$2,'Mathematics'),($3,$4,'Mathematics')",
    [subject, school, id(34), foreign],
  );
  await db.query(
    "insert into teachers(id,school_id,full_name,reference,membership_id) values($1,$2,'Fictional Teacher','T1',$3),($4,$5,'Foreign Teacher','T1',null)",
    [teacherRecord, school, teacher, id(35), foreign],
  );
  await db.query(
    "insert into students(id,school_id,full_name,reference,membership_id) values($1,$2,'Fictional Original','S1',$3),($4,$2,'Fictional Newcomer','S2',$5)",
    [learner, school, student, lateLearner, lateUser],
  );
  await db.query(
    "insert into guardians(id,school_id,full_name,reference,membership_id) values($1,$2,'Fictional Guardian','G1',$3)",
    [guardianRecord, school, guardian],
  );
  await db.query(
    "insert into student_guardians(school_id,student_id,guardian_id,relationship,access_enabled) values($1,$2,$3,'Guardian',true)",
    [school, learner, guardianRecord],
  );
  await db.query(
    "insert into enrollments(id,school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,current_date-30,current_date+30),($6,$2,$7,$4,$5,$8,current_date+30)",
    [enrollment, school, learner, classroom, year, id(21), lateLearner, today],
  );
  await db.query(
    "insert into teaching_assignments(id,school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6,current_date-30,current_date+30),($7,$8,$9,$10,$11,$12,current_date-30,current_date+30)",
    [
      assignment,
      school,
      teacherRecord,
      subject,
      classroom,
      year,
      foreignAssignment,
      foreign,
      id(35),
      id(34),
      id(32),
      id(30),
    ],
  );
}, 90000);
beforeEach(async () => {
  await db.exec("begin");
});
afterEach(async () => {
  await db.exec("rollback");
});
afterAll(async () => {
  await db.close();
});

it("hides drafts, publishes directly, withdraws and republishes with stable ownership", async () => {
  await user(teacher); const item = await save();
  await user(student); expect(await list()).toHaveLength(0);
  expect((await db.query("select * from announcements")).rows).toHaveLength(0);
  await user(teacher); await save({id:item,version:1,status:"published"});
  await user(student); expect((await list())[0]).toMatchObject({id:item,can_edit:false});
  await user(teacher); await save({id:item,version:2,status:"withdrawn"});
  await user(guardian); expect(await list("guardian",learner)).toHaveLength(0);
  await user(teacher); await save({id:item,version:3,status:"published"});
  await owner(); expect((await db.query("select created_by,record_version from announcements where id=$1",[item])).rows[0]).toEqual({created_by:teacher,record_version:4});
});
it("newcomers read earlier published notices and leavers lose access", async () => {
  await user(teacher); const item = await save({status:"published"});
  await owner(); await db.query("update announcements set published_at=now()-interval '10 days' where id=$1",[item]);
  await user(lateUser); expect(await list()).toHaveLength(1);
  await owner(); await db.query("update enrollments set ends_on=$1 where id=$2",[yesterday,enrollment]);
  await user(student); expect(await list()).toHaveLength(0);
  expect((await db.query("select * from announcements")).rows).toHaveLength(0);
  await user(guardian); expect(await list("guardian",learner)).toHaveLength(0);
});
it("reserves school-wide publishing for Admin while all linked roles read published notices", async () => {
  await user(teacher); await rejection(()=>save({classId:null,status:"published"}),"42501");
  await user(admin); await save({mode:"school_admin",classId:null,status:"published"});
  await save({mode:"school_admin",classId:null,status:"draft"});
  await user(teacher); expect(await list("teacher")).toMatchObject([{can_edit:false}]);
  await user(student); expect(await list()).toHaveLength(1);
  await user(guardian); expect(await list("guardian",learner)).toHaveLength(1);
  await user(outsider); expect((await db.query("select * from announcements")).rows).toHaveLength(0);
  await rejection(()=>list("school_admin"),"42501");
});
it("denies unrelated classes, foreign school writes and audience changes", async () => {
  await user(teacher);
  await rejection(()=>save({classId:secondClass}),"42501");
  await rejection(()=>save({classId:id(32)}),"42501");
  const item=await save();
  await user(outsider); await rejection(()=>save({mode:"school_admin",id:item,version:1}),"42501");
  await user(admin); await rejection(()=>save({mode:"school_admin",id:item,version:1,classId:null}),"42501");
  await rejection(()=>save({mode:"school_admin",id:item,version:1,classId:secondClass}),"42501");
});
it("separates teacher roster access from a combined account's guardian access", async () => {
  await user(teacher); await save({status:"published"});
  await owner(); await db.query("insert into membership_roles values($1,$2,'guardian')",[teacher,school]);
  await db.query("update guardians set membership_id=$1 where id=$2",[teacher,guardianRecord]);
  await user(teacher); expect(await list("teacher")).toHaveLength(1);
  expect(await list("guardian",learner)).toHaveLength(1);
  await rejection(()=>list("guardian",lateLearner),"42501");
  await owner(); await db.query("update student_guardians set access_enabled=false where guardian_id=$1",[guardianRecord]);
  await user(teacher); await rejection(()=>list("guardian",learner),"42501");
  expect(await list("teacher")).toHaveLength(1);
});
it("removes ended teachers' access while Admin can manage their notices", async () => {
  await user(teacher); const item=await save({status:"published"});
  await owner(); await db.query("update teaching_assignments set ends_on=$1 where id=$2",[yesterday,assignment]);
  await user(teacher); expect(await list("teacher")).toHaveLength(0);
  await rejection(()=>save({id:item,version:1}),"42501");
  await user(admin); await save({mode:"school_admin",id:item,version:1,status:"withdrawn"});
});
it("rejects stale versions without replacing the first save", async () => {
  await user(teacher); const item=await save();
  await save({id:item,version:1,title:"First edit"});
  await rejection(()=>save({id:item,version:1,title:"Stale edit"}),"40001");
  expect((await db.query("select title from announcements where id=$1",[item])).rows[0]).toEqual({title:"First edit"});
});
it("rolls back the save if audit insertion fails", async () => {
  await owner(); await db.exec(`create function public.fail_notice_audit() returns trigger language plpgsql as $$ begin raise exception 'test audit failure'; end $$;
    create trigger fail_notice before insert on public.audit_events for each row execute function public.fail_notice_audit();`);
  await user(teacher); await rejection(()=>save(),"P0001");
  expect(await list("teacher")).toHaveLength(0);
});
it("denies direct writes even to Admin and denies anonymous execution", async () => {
  await user(admin);
  await rejection(()=>db.query("insert into announcements(school_id,title,body,status,created_by) values($1,'x','x','draft',$2)",[school,admin]),"42501");
  await rejection(()=>db.exec("update announcements set title='bad'"),"42501");
  await rejection(()=>db.exec("delete from announcements"),"42501");
  await db.exec("set local role anon"); await rejection(()=>list("school_admin"),"42501");
  await rejection(()=>save({mode:"school_admin",classId:null}),"42501");
});
it.each([{title:"\t\n"},{body:" "},{title:"x".repeat(161)},{body:"x".repeat(10001)},{status:"scheduled"},{version:2},{status:"withdrawn"}])("rejects malformed fields %j",async fields=>{
  await user(teacher); await rejection(()=>save(fields),"22023");
});
it("cannot turn a previously published item into a draft",async()=>{
  await user(teacher); const item=await save({status:"published"});
  await rejection(()=>save({id:item,version:1,status:"draft"}),"22023");
});
it("bounds search and pages and returns only permitted classes",async()=>{
  await user(teacher);
  expect((await db.query("select * from search_announcement_classes($1,'teacher','',1)",[school])).rows).toMatchObject([{id:classroom}]);
  expect((await db.query("select * from search_announcement_classes($1,'teacher','%',1)",[school])).rows).toHaveLength(0);
  await rejection(()=>list("teacher",null,0),"22023");
  await rejection(()=>db.query("select * from search_announcement_classes($1,'teacher','',0)",[school]),"22023");
  await rejection(()=>list("teacher",learner),"22023");
  await user(student); await rejection(()=>db.query("select * from search_announcement_classes($1,'teacher','',1)",[school]),"42501");
});
it("paginates notices and isolates a second school's own notice",async()=>{
  await user(admin); for(let n=0;n<52;n++) await save({mode:"school_admin",classId:null,status:"published",title:`Notice ${n}`});
  await user(student); expect(await list()).toHaveLength(51); expect(await list("student",null,2)).toHaveLength(2);
  await user(outsider); const other=await save({school:foreign,mode:"school_admin",classId:null,status:"published"});
  expect((await db.query("select id from announcements")).rows).toEqual([{id:other}]);
  await user(admin); expect((await db.query("select id from announcements where id=$1",[other])).rows).toHaveLength(0);
  await rejection(()=>save({id:other,version:1,mode:"school_admin",classId:null}),"42501");
});
it.each(["suspend","role","school","unlink"])("denies access after %s",async change=>{
  await user(teacher); await save({status:"published"});
  await owner();
  if(change==="suspend") await db.query("update school_memberships set status='suspended' where id=$1",[student]);
  if(change==="role") await db.query("delete from membership_roles where membership_id=$1",[student]);
  if(change==="school") await db.query("update schools set active=false where id=$1",[school]);
  if(change==="unlink") await db.query("update students set membership_id=null where id=$1",[learner]);
  await user(student); await rejection(()=>list(),"42501");
  expect((await db.query("select * from announcements")).rows).toHaveLength(0);
});

