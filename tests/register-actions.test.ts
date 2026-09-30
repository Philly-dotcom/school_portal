import { beforeEach, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({context:vi.fn(),from:vi.fn(),insert:vi.fn()}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
vi.mock("@/lib/auth-context",()=>({getSchoolContext:mock.context}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({from:mock.from})}));
import { createRegisterRecord } from "../src/app/dashboard/registers/actions";
const state={error:"",saved:false};
function form(values:Record<string,string>){const f=new FormData();for(const [k,v] of Object.entries(values))f.set(k,v);return f;}
beforeEach(()=>{vi.clearAllMocks();mock.context.mockResolvedValue({status:"ready",roles:["school_admin"],school:{id:"trusted"}});mock.from.mockReturnValue({insert:mock.insert});mock.insert.mockResolvedValue({error:null});});
it("rejects direct non-admin and unavailable access",async()=>{
  for(const context of [{status:"forbidden"},{status:"ready",roles:["guardian"]}]){
    mock.context.mockResolvedValue(context);expect((await createRegisterRecord(state,form({kind:"students",full_name:"Fictional",reference:"S-1"}))).saved).toBe(false);
  }expect(mock.from).not.toHaveBeenCalled();
});
it("ignores forged ownership and Auth identity fields",async()=>{
  expect((await createRegisterRecord(state,form({kind:"students",full_name:" Fictional ",reference:" S-1 ",school_id:"forged",user_id:"forged",id:"forged"}))).saved).toBe(true);
  expect(mock.insert).toHaveBeenCalledWith({full_name:"Fictional",reference:"S-1",school_id:"trusted"});
});
it("rejects arbitrary tables and malformed relationships",async()=>{
  const invalid: Record<string,string>[] = [{kind:"school_memberships",full_name:"Bad",reference:"BAD"},{kind:"student_guardians",student_id:"invalid",guardian_id:"invalid",relationship:"Parent"},{kind:"teachers",full_name:" ",reference:"BAD"}];
  for(const data of invalid)
    expect((await createRegisterRecord(state,form(data))).saved).toBe(false);
  expect(mock.from).not.toHaveBeenCalled();
});
it("reports constraint failures without database details",async()=>{
  mock.insert.mockResolvedValue({error:{code:"23505",message:"private database detail"}});
  const result=await createRegisterRecord(state,form({kind:"teachers",full_name:"Fictional",reference:"TE-1"}));
  expect(result.saved).toBe(false);expect(result.error).toContain("already exists");expect(result.error).not.toContain("private database");
});
