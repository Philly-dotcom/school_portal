import { beforeEach,expect,it,vi } from "vitest";
const mock=vi.hoisted(()=>({context:vi.fn(),rpc:vi.fn()}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
vi.mock("@/lib/auth-context",()=>({getSchoolContext:mock.context}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({rpc:mock.rpc})}));
import { correctRecord } from "../src/app/dashboard/corrections/actions";
const id="00000000-0000-4000-8000-000000000001";
const state={error:"",saved:false};
function form(values:Record<string,string>){const f=new FormData();for(const [k,v] of Object.entries(values))f.set(k,v);return f;}
beforeEach(()=>{vi.clearAllMocks();mock.context.mockResolvedValue({status:"ready",roles:["school_admin"],school:{id:"trusted"}});mock.rpc.mockResolvedValue({data:2,error:null});});
it("requires an active verified administrator",async()=>{
  for(const context of [{status:"forbidden"},{status:"ready",roles:["teacher"]}]){
    mock.context.mockResolvedValue(context);expect((await correctRecord(state,form({kind:"grades",id,version:"1",name:"Grade10"}))).saved).toBe(false);
  }expect(mock.rpc).not.toHaveBeenCalled();
});
it("normalizes grade names, ignores forged school ownership and forwards the version",async()=>{
  expect((await correctRecord(state,form({kind:"grades",id,version:"1",name:"grade10",school_id:"forged"}))).saved).toBe(true);
  expect(mock.rpc).toHaveBeenCalledWith("correct_school_record",{target_school:"trusted",record_kind:"grades",target_record:id,expected_version:1,corrected_name:"Grade 10",corrected_reference:null});
});
it("rejects invalid kinds, references and versions before RPC",async()=>{
  const base={kind:"students",id,version:"1",name:"Fictional",reference:"ST-1"};
  for(const change of [{kind:"schools"},{reference:""},{version:"0"},{version:"1.5"},{version:"9999999999999999"}])
    expect((await correctRecord(state,form({...base,...change}))).saved).toBe(false);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it("reports stale writes and duplicates without database detail",async()=>{
  for(const [code,message] of [["40001","Reload"],["23505","already exists"]]){
    mock.rpc.mockResolvedValue({error:{code,message:"private detail"},data:null});
    const result=await correctRecord(state,form({kind:"grades",id,version:"1",name:"Grade 10"}));
    expect(result.saved).toBe(false);expect(result.error).toContain(message);expect(result.error).not.toContain("private detail");
  }
});
