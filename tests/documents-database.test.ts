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
const hash = "a".repeat(64);
async function prepare(options: {mode?: string; classId?: string|null; school?: string; size?: number; title?: string}={}) {
 return (await db.query<{id:string}>("select prepare_document($1,$2,$3,$4,$5,$6) id",[
  options.school??school, options.mode??"teacher", options.classId===undefined?classroom:options.classId,
  options.title??"Fictional PDF",options.size??100,hash])).rows[0].id;
}
async function upload(doc: string, scope=school, metadata: unknown={size:100,mimetype:"application/pdf"}) {
 return db.query("insert into storage.objects(bucket_id,name,metadata) values('school-documents',$1,$2)",[`${scope}/${doc}.pdf`,JSON.stringify(metadata)]);
}
async function change(doc:string,version=1,status="published",mode="teacher",scope=school) {
 return db.query("select change_document($1,$2,$3,$4,$5)",[scope,mode,doc,version,status]);
}
async function list(mode="student",child:string|null=null,page=1,target:string|null=null) {
 return (await db.query<{id:string;status:string;can_edit:boolean}>("select * from list_documents($1,$2,$3,$4,$5)",[school,mode,child,page,target])).rows;
}
async function objects() { return (await db.query("select name from storage.objects")).rows; }
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

it("creates a private PDF-only bucket with the 2 MiB limit",async()=>{
  expect((await db.query("select public,file_size_limit::integer,allowed_mime_types from storage.buckets where id='school-documents'")).rows[0])
    .toEqual({public:false,file_size_limit:2097152,allowed_mime_types:["application/pdf"]});
});
it("keeps unfinished uploads and drafts private, then publishes and withdraws",async()=>{
  await user(teacher); const doc=await prepare(); await upload(doc);
  await user(student); expect(await list()).toHaveLength(0); expect(await objects()).toHaveLength(0);
  await user(teacher); await change(doc,1,"draft");
  await user(student); expect(await list()).toHaveLength(0); expect(await objects()).toHaveLength(0);
  await user(teacher); await change(doc,2);
  await user(student); expect(await list()).toMatchObject([{id:doc,can_edit:false}]); expect(await objects()).toHaveLength(1);
  await user(teacher); await change(doc,3,"withdrawn");
  await user(guardian); expect(await list("guardian",learner)).toHaveLength(0); expect(await objects()).toHaveLength(0);
  await user(teacher); await change(doc,4,"published");
  await user(student); expect(await objects()).toHaveLength(1);
});
it("rejects publication before an upload exists but lets staff withdraw the unfinished row",async()=>{
  await user(teacher); const doc=await prepare();
  await rejection(()=>change(doc),"22023"); await change(doc,1,"withdrawn");
  await rejection(()=>upload(doc),"42501");
});
it.each([{size:101,mimetype:"application/pdf"},{size:100,mimetype:"image/png"},{}])("rejects finalizing mismatched storage metadata %j",async metadata=>{
  await user(teacher); const doc=await prepare(); await upload(doc,school,metadata);
  await rejection(()=>change(doc),"22023");
});
it("blocks arbitrary paths and another uploader's reservation",async()=>{
  await user(teacher); const doc=await prepare();
  await rejection(()=>upload(id(500)),"42501");
  await rejection(()=>upload(doc,foreign),"42501");
  await user(admin); await rejection(()=>upload(doc),"42501");
});
it("prevents overwrite and deletion even with an unrelated permissive storage policy",async()=>{
  await user(teacher); const doc=await prepare(); await upload(doc);
  await owner(); await db.exec("create policy unrelated_allow on storage.objects for all to authenticated using(true) with check(true)");
  await user(admin);
  expect((await db.query("update storage.objects set metadata='{}' returning name")).rows).toHaveLength(0);
  expect((await db.query("delete from storage.objects returning name")).rows).toHaveLength(0);
  await user(student); expect(await objects()).toHaveLength(0); await rejection(()=>upload(id(600)),"42501");
  await user(teacher); expect(await objects()).toHaveLength(1);
});
it("follows current enrollment for new joiners and leavers",async()=>{
  await user(teacher); const doc=await prepare(); await upload(doc); await change(doc);
  await user(lateUser); expect(await list()).toHaveLength(1); expect(await objects()).toHaveLength(1);
  await owner(); await db.query("update enrollments set ends_on=$1 where id=$2",[yesterday,enrollment]);
  await user(student); expect(await list()).toHaveLength(0); expect(await objects()).toHaveLength(0);
  await user(guardian); expect(await list("guardian",learner)).toHaveLength(0); expect(await objects()).toHaveLength(0);
});
it("requires explicit child grants despite teacher roster access",async()=>{
  await user(teacher); const doc=await prepare(); await upload(doc); await change(doc);
  await owner(); await db.query("insert into membership_roles values($1,$2,'guardian')",[teacher,school]);
  await db.query("update guardians set membership_id=$1 where id=$2",[teacher,guardianRecord]);
  await user(teacher); expect(await list("teacher")).toHaveLength(1); expect(await list("guardian",learner)).toHaveLength(1);
  await rejection(()=>list("guardian",lateLearner),"42501");
  await owner(); await db.query("update student_guardians set access_enabled=false where guardian_id=$1",[guardianRecord]);
  await user(teacher); await rejection(()=>list("guardian",learner),"42501");
});
it("revokes guardian storage reads immediately with the child grant",async()=>{
  await user(teacher); const doc=await prepare(); await upload(doc); await change(doc);
  await user(guardian); expect(await objects()).toHaveLength(1);
  await owner(); await db.query("update student_guardians set access_enabled=false where guardian_id=$1",[guardianRecord]);
  await user(guardian); expect(await objects()).toHaveLength(0); await rejection(()=>list("guardian",learner),"42501");
});
it("reserves school-wide uploads to Admin and publishes them across linked roles",async()=>{
  await user(teacher); await rejection(()=>prepare({classId:null}),"42501");
  await rejection(()=>prepare({classId:secondClass}),"42501");
  await user(admin); const doc=await prepare({classId:null,mode:"school_admin"}); await upload(doc); await change(doc,1,"published","school_admin");
  await user(student); expect(await objects()).toHaveLength(1);
  await user(guardian); expect(await list("guardian",learner)).toHaveLength(1);
  await user(teacher); expect(await list("teacher")).toMatchObject([{can_edit:false}]); await rejection(()=>change(doc,2,"withdrawn"),"42501");
});
it("isolates both reads and writes for another school",async()=>{
  await user(teacher); const doc=await prepare(); await upload(doc); await change(doc);
  await user(outsider); expect(await objects()).toHaveLength(0);
  await rejection(()=>list("school_admin"),"42501"); await rejection(()=>change(doc,2,"withdrawn","school_admin"),"42501");
  await rejection(()=>prepare({school:foreign,classId:classroom,mode:"school_admin"}),"42501");
  const other=await prepare({school:foreign,classId:null,mode:"school_admin"}); await upload(other,foreign); await change(other,1,"published","school_admin",foreign);
  expect(await objects()).toEqual([{name:`${foreign}/${other}.pdf`}]);
  await user(admin); expect(await objects()).toEqual([{name:`${school}/${doc}.pdf`}]);
});
it("removes an ended teacher's upload, metadata and file access",async()=>{
  await user(teacher); const doc=await prepare(); await upload(doc); await change(doc);
  await owner(); await db.query("update teaching_assignments set ends_on=$1 where id=$2",[yesterday,assignment]);
  await user(teacher); expect(await list("teacher")).toHaveLength(0); expect(await objects()).toHaveLength(0);
  await rejection(()=>change(doc,2,"withdrawn"),"42501"); await rejection(()=>prepare(),"42501");
  await user(admin); await change(doc,2,"withdrawn","school_admin");
});
it("rejects stale status changes and keeps the saved state",async()=>{
  await user(teacher); const doc=await prepare(); await upload(doc); await change(doc,1,"draft");
  await rejection(()=>change(doc,1),"40001"); expect(await list("teacher")).toMatchObject([{status:"draft"}]);
});
it("rolls back prepare and state changes when audit fails",async()=>{
  await user(teacher); const doc=await prepare(); await upload(doc);
  await owner(); await db.exec(`create function public.fail_doc_audit() returns trigger language plpgsql as $$ begin raise exception 'audit unavailable'; end $$;
    create trigger fail_doc before insert on public.audit_events for each row execute function public.fail_doc_audit();`);
  await user(teacher); await rejection(()=>prepare(),"P0001"); await rejection(()=>change(doc),"P0001");
  expect(await list("teacher")).toMatchObject([{id:doc,status:"uploading"}]);
});
it("denies direct metadata writes and anonymous RPCs/uploads",async()=>{
  await user(admin);
  await rejection(()=>db.exec("delete from documents"),"42501");
  await rejection(()=>db.exec("update documents set status='published'"),"42501");
  await rejection(()=>db.query("insert into documents(school_id,title,file_size,sha256,created_by) values($1,'x',100,$2,$3)",[school,hash,admin]),"42501");
  await db.exec("set local role anon"); await rejection(()=>prepare(),"42501"); await rejection(()=>list(),"42501");
  await rejection(()=>upload(id(900)),"42501");
});
it.each([0,2097153])("rejects invalid size %s",async size=>{
  await user(teacher); await rejection(()=>prepare({size}),"22023");
});
it.each(["suspended","unlinked","inactive"])("removes readers after %s",async changeType=>{
  await user(teacher); const doc=await prepare(); await upload(doc); await change(doc);
  await owner();
  if(changeType==="suspended") await db.query("update school_memberships set status='suspended' where id=$1",[student]);
  if(changeType==="unlinked") await db.query("update students set membership_id=null where id=$1",[learner]);
  if(changeType==="inactive") await db.query("update schools set active=false where id=$1",[school]);
  await user(student); expect(await objects()).toHaveLength(0); await rejection(()=>list(),"42501");
});

