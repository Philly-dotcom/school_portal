import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, afterEach, afterAll, expect, it } from "vitest";
import { installStorageStub } from "./helpers/storage-stub";
const db = new PGlite();
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function user(n: number) { await db.exec("set local role authenticated"); await db.query("select set_config('request.jwt.claim.sub',$1,true)", [id(n)]); }
beforeAll(async () => {
    await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
 create schema auth; create table auth.users(id uuid primary key,email varchar(255),email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to authenticated,anon;`);
    await installStorageStub(db);
    for (const file of readdirSync("supabase/migrations").sort())
        await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
    for (const base of [0, 100]) {
        await db.query("insert into schools(id,name,timezone) values($1,'Fictional school','Africa/Johannesburg')", [id(base + 1)]);
        for (const [n, role] of [[2, "school_admin"], [3, "teacher"], [4, "student"], [5, "guardian"]] as const) {
            await db.query("insert into auth.users(id) values($1)", [id(base + n)]);
            await db.query("insert into profiles(user_id) values($1)", [id(base + n)]);
            await db.query("insert into school_memberships(id,user_id,school_id) values($1,$1,$2)", [id(base + n), id(base + 1)]);
            await db.query("insert into membership_roles values($1,$2,$3)", [id(base + n), id(base + 1), role]);
        }
        await db.query("insert into academic_years(id,school_id,name,starts_on,ends_on) values($1,$2,'Fictional year',current_date-90,current_date+90)", [id(base + 10), id(base + 1)]);
        await db.query("insert into academic_terms(id,school_id,academic_year_id,name,starts_on,ends_on) values($1,$2,$3,'Term',current_date-60,current_date+60)", [id(base + 11), id(base + 1), id(base + 10)]);
        await db.query("insert into grades(id,school_id,name) values($1,$2,'Grade 8')", [id(base + 12), id(base + 1)]);
        await db.query("insert into subjects(id,school_id,name) values($1,$2,'Maths')", [id(base + 13), id(base + 1)]);
        await db.query("insert into classes(id,school_id,academic_year_id,grade_id,name) values($1,$2,$3,$4,'8A')", [id(base + 14), id(base + 1), id(base + 10), id(base + 12)]);
        await db.query("insert into teachers(id,school_id,full_name,reference,membership_id) values($1,$2,'Fictional Teacher','T1',$3)", [id(base + 15), id(base + 1), id(base + 3)]);
        await db.query("insert into teaching_assignments(id,school_id,teacher_id,subject_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,$5,$6,current_date-30,current_date+30)", [id(base + 16), id(base + 1), id(base + 15), id(base + 13), id(base + 14), id(base + 10)]);
    }
}, 90000);
beforeEach(async () => { await db.exec("begin"); });
afterEach(async () => { await db.exec("rollback"); });
afterAll(async () => { await db.close(); });
async function save(o: {
    mode?: string;
    item?: string;
    version?: number;
    term?: string;
    assignment?: string;
    minimum?: string;
    maximum?: string;
    precision?: number;
    authorise?: boolean;
    offset?: number;
} = {}) {
    return (await db.query<{
        id: string;
    }>("select save_assessment($1,$2,$3,$4,$5,$6,'Fictional test','Instructions',current_date+$7::integer,$8::numeric,$9::numeric,$10,$11) id", [id(1), o.mode ?? "teacher", o.item ?? null, o.assignment ?? id(16), o.version ?? 0, o.term ?? id(11), o.offset ?? 1, o.minimum ?? "0", o.maximum ?? "40", o.precision ?? 0, o.authorise ?? false])).rows[0].id;
}
it("retains definition versions and requires fresh explicit Admin scale authorisation", async () => {
    await user(3);
    const item = await save();
    await user(2);
    await save({ item, version: 1, mode: "school_admin", authorise: true });
    await user(3);
    await save({ item, version: 2 });
    const rows = (await db.query<{
        version: number;
        scale_authorised_by: string | null;
    }>("select version,scale_authorised_by from assessment_versions order by version")).rows;
    expect(rows.map(r => r.scale_authorised_by)).toEqual([null, id(2), null]);
    await expect(save({ item, version: 2 })).rejects.toThrow(/changed/);
});
it.each([4, 5, 102, 103])("denies caller %s draft reads and RPC writes", async (who) => {
    await user(3);
    await save();
    await user(who);
    expect((await db.query("select * from assessments")).rows).toHaveLength(0);
    expect((await db.query("select * from assessment_versions")).rows).toHaveLength(0);
    await expect(save()).rejects.toThrow(/access/);
});
it("denies anonymous direct reads", async () => { await db.exec("set local role anon"); await expect(db.query("select * from assessment_versions")).rejects.toThrow(/permission denied/); });
it("denies direct staff mutation of immutable versions", async () => { await user(2); await expect(db.query("update assessment_versions set title='Changed'")).rejects.toThrow(/permission denied/); });
it.each([{ term: id(111) }, { assignment: id(116) }, { offset: 61 }, { minimum: "2", maximum: "1" }, { maximum: "NaN" }, { maximum: "Infinity" }, { maximum: "1.11", precision: 1 }, { authorise: true }])("rejects invalid relationship, bounds or teacher authorisation %#", async (o) => { await user(3); await expect(save(o)).rejects.toThrow(); });
it("permits assigned teacher future planning but not another teacher's choices", async () => {
    await user(3);
    await save({ offset: 20 });
    const choices = (await db.query("select * from search_assessment_choices($1,'teacher','assignment',null,'',1)", [id(1)])).rows;
    expect(choices).toHaveLength(1);
    await expect(db.query("select * from search_assessment_choices($1,'teacher','term',$2,'',1)", [id(1), id(116)])).rejects.toThrow();
});
it("does not offer expired assignments to teachers", async () => {
    await db.query("update teaching_assignments set ends_on=current_date-1 where id=$1", [id(16)]);
    await user(3);
    await expect(save({ offset: -2 })).rejects.toThrow(/access/);
});
it("checks year agreement even when term belongs to the same school", async () => {
    await db.query("insert into academic_years(id,school_id,name,starts_on,ends_on) values($1,$2,'Other',current_date-90,current_date+90)", [id(50), id(1)]);
    await db.query("insert into academic_terms(id,school_id,academic_year_id,name,starts_on,ends_on) values($1,$2,$3,'Other',current_date-60,current_date+60)", [id(51), id(1), id(50)]);
    await user(3);
    await expect(save({ term: id(51) })).rejects.toThrow(/term/);
});


it("finds terms by the selected assignment year with a blank or matching search", async () => {
    await user(3);
    const search = async (query: string) => (await db.query<{ id: string; label: string }>(
        "select * from search_assessment_choices($1,'teacher','term',$2,$3,1)",
        [id(1), id(16), query],
    )).rows;
    expect((await search("")).map(row => row.id)).toEqual([id(11)]);
    expect((await search(" term ")).map(row => row.id)).toEqual([id(11)]);
    expect(await search("unmatched")).toEqual([]);
    await db.exec("reset role");
    await db.query("delete from academic_terms where id=$1", [id(11)]);
    await user(3);
    // An assignment exists, but an empty year must not inherit School B's terms.
    expect(await search("")).toEqual([]);
});

async function prepareDraft(offset = -2, authorise = true, count = 2) {
    for (let i = 0; i < count; i++) {
        const learner = id(200 + i);
        await db.query("insert into students(id,school_id,full_name,reference) values($1,$2,'Fictional learner',$3)", [learner, id(1), "S" + i]);
        await db.query("insert into enrollments(school_id,student_id,class_id,academic_year_id,starts_on,ends_on) values($1,$2,$3,$4,current_date-15,current_date+15)", [id(1), learner, id(14), id(10)]);
    }
    await user(2);
    return save({ mode: "school_admin", offset, authorise });
}
const freeze = (item: string) => db.query("select freeze_assessment_roster($1,$2,'school_admin',1)", [id(1), item]);
const readDraft = async (item: string, page = 1) => (await db.query<{
    draft: { revision: number | null; entries: { id: string; state: string; score: string | null }[] };
}>("select read_assessment_draft($1,$2,'teacher',$3) draft", [id(1), item, page])).rows[0].draft;
const mark = (i: number, state: string, score: string | null = null, reason = "") => ({ id: id(200+i), state, score, reason });
const write = (item: string, version: number, changes: ReturnType<typeof mark>[]) =>
    db.query("select save_assessment_draft($1,$2,'teacher',$3,$4::jsonb)", [id(1), item, version, JSON.stringify(changes)]);

it("retains dated placements, preserves untouched pages and distinguishes zero from missing", async () => {
    const item = await prepareDraft(-2, true, 26);
    await user(3);
    expect((await readDraft(item)).revision).toBeNull();
    await user(2);
    await freeze(item);
    await db.exec("reset role");
    await db.query("update enrollments set starts_on=current_date where student_id=$1", [id(225)]);
    await user(3);
    await write(item, 1, [mark(0, "scored", "0"), mark(1, "exempt", null, "School-approved exemption")]);
    await write(item, 2, [mark(25, "absent")]);
    const first = await readDraft(item);
    expect(first.revision).toBe(3);
    expect(first.entries.slice(0,3).map(x => [x.state,x.score])).toEqual([["scored","0"],["exempt",null],["missing",null]]);
    expect((await readDraft(item, 2)).entries).toMatchObject([{ id: id(225), state: "absent" }]);
    await expect(write(item, 2, [mark(0, "missing")])).rejects.toThrow(/changed/);
});
it.each([mark(1,"scored","41"), mark(1,"scored","1.1"), mark(1,"exempt"), mark(1,"absent","0"), mark(75,"absent")])("rolls back invalid draft batches %#", async invalid => {
    const item = await prepareDraft();
    await freeze(item);
    await user(3);
    await db.exec("savepoint invalid_batch");
    await expect(write(item, 1, [mark(0,"scored","5"), invalid])).rejects.toThrow();
    await db.exec("rollback to invalid_batch");
    expect(await readDraft(item)).toMatchObject({ revision: 1, entries: [{ state: "missing" },{ state: "missing" }] });
});
it.each([[3,true],[-2,false]] as const)("rejects premature capture or unauthorised scale %#", async (offset, approved) => {
    const item = await prepareDraft(offset, approved);
    await expect(freeze(item)).rejects.toThrow(/freeze/);
});
it("locks the academic definition once the roster is frozen", async () => {
    const item = await prepareDraft();
    await freeze(item);
    await expect(save({ item, mode:"school_admin", version:1, offset:-2 })).rejects.toThrow(/frozen/);
});
it.each([4,5,102,103])("denies draft RPCs and direct mark access to caller %s", async who => {
    const item = await prepareDraft();
    await freeze(item);
    await user(who);
    for (const request of [
        () => readDraft(item), () => write(item,1,[mark(0,"absent")]), () => freeze(item),
        () => db.query("select * from assessment_mark_versions"),
        () => db.query("delete from assessment_rosters"),
    ]) {
        await db.exec("savepoint forbidden");
        await expect(request()).rejects.toThrow();
        await db.exec("rollback to forbidden");
    }
});
