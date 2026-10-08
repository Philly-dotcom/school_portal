import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ context: vi.fn(), rpc: vi.fn(), revalidate: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidate }));
vi.mock("@/lib/auth-context", () => ({ getSchoolContext: mock.context }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mock.rpc }) }));
import { saveAnnouncement } from "../src/app/dashboard/announcements/actions";
import { searchAnnouncementClasses } from "../src/app/dashboard/announcements/search-actions";
import { loadAnnouncement } from "../src/lib/announcement-data";
import { announcementHref, announcementInput } from "../src/lib/announcement-validation";
const id="00000000-0000-4000-8000-000000000001";
const state={error:"",saved:false};
function form(changes: Record<string,string | undefined>={}) {
  const data=new FormData();
  for(const [key,value] of Object.entries({mode:"teacher",id:"",classId:id,scope:"class",version:"0",title:" Notice ",body:" Message ",status:"draft",...changes})) if (value !== undefined) data.set(key,value);
  return data;
}
beforeEach(()=>{
  vi.clearAllMocks();
  mock.context.mockResolvedValue({status:"ready",roles:["teacher"],school:{id:"trusted"}});
  mock.rpc.mockResolvedValue({data:id,error:null});
});
it("derives school from verified context and ignores forged author fields",async()=>{
  expect(await saveAnnouncement(state,form({schoolId:"foreign",created_by:"forged"}))).toEqual({error:"",saved:true});
  expect(mock.rpc).toHaveBeenCalledWith("save_announcement",{target_school:"trusted",staff_mode:"teacher",target_announcement:null,target_class:id,expected_version:0,new_title:"Notice",new_body:"Message",new_status:"draft"});
  expect(mock.revalidate).toHaveBeenCalledWith("/dashboard");
});
it.each([{classId:"",scope:"school"},{classId:""},{version:"bad"},{body:"  "},{title:"x".repeat(161)}])("rejects invalid or widened input %j",async changes=>{
  expect((await saveAnnouncement(state,form(changes))).saved).toBe(false); expect(mock.rpc).not.toHaveBeenCalled();
});
it("requires an explicit school scope even for Admin",async()=>{
  mock.context.mockResolvedValue({status:"ready",roles:["school_admin"],school:{id:"trusted"}});
  expect((await saveAnnouncement(state,form({mode:"school_admin",classId:"",scope:"class"}))).saved).toBe(false);
  expect(mock.rpc).not.toHaveBeenCalled();
  expect((await saveAnnouncement(state,form({mode:"school_admin",classId:"",scope:"school"}))).saved).toBe(true);
});
it("does not authorize through a forged mode",async()=>{
  expect((await saveAnnouncement(state,form({mode:"school_admin"}))).saved).toBe(false); expect(mock.rpc).not.toHaveBeenCalled();
});
it("preserves authentication redirects",async()=>{
  mock.context.mockRejectedValue(new Error("NEXT_REDIRECT"));
  await expect(saveAnnouncement(state,form())).rejects.toThrow("NEXT_REDIRECT");
});
it("reports a conflict and hides database error details",async()=>{
  mock.rpc.mockResolvedValue({data:null,error:{code:"40001",message:"private detail"}});
  const result=await saveAnnouncement(state,form()); expect(result.error).toContain("Reload"); expect(result.error).not.toContain("private detail");
});
it("does not claim a failed transport saved",async()=>{
  mock.rpc.mockRejectedValue(new Error("private detail"));
  expect(await saveAnnouncement(state,form())).toMatchObject({saved:false}); expect(mock.revalidate).not.toHaveBeenCalled();
});
it("bounds class search and retains lookahead",async()=>{
  mock.rpc.mockResolvedValue({data:Array.from({length:26},()=>({id,label:"8A"})),error:null});
  const result=await searchAnnouncementClasses("teacher","  8A ",1);
  expect(result.choices).toHaveLength(25); expect(result.hasNext).toBe(true);
  expect(mock.rpc).toHaveBeenCalledWith("search_announcement_classes",{target_school:"trusted",staff_mode:"teacher",search_text:"8A",page_number:1});
  mock.rpc.mockClear(); expect((await searchAnnouncementClasses("teacher","",0)).error).not.toBe(""); expect(mock.rpc).not.toHaveBeenCalled();
});
it("distinguishes empty reads from unavailable reads",async()=>{
  mock.rpc.mockResolvedValue({data:[],error:null}); expect(await loadAnnouncement("trusted","student")).toMatchObject({rows:[],page:1,hasNext:false});
  mock.rpc.mockResolvedValue({data:null,error:{code:"42501"}}); expect(await loadAnnouncement("trusted","student")).toBeNull();
});
it("filters the editor by ID and preserves guardian pagination links",async()=>{
  mock.rpc.mockResolvedValue({data:[],error:null}); await loadAnnouncement("trusted","school_admin",{page:"5",edit:id});
  expect(mock.rpc).toHaveBeenCalledWith("list_announcements",{target_school:"trusted",portal_mode:"school_admin",selected_student:null,page_number:1,target_announcement:id});
  expect(announcementHref("guardian",{child:id,page:2})).toContain(`view=announcements&mode=guardian&child=${id}&announcementPage=2`);
});
it("requires a positive version for existing records",()=>{
  expect(announcementInput.safeParse({mode:"teacher",id,classId:id,scope:"class",version:0,title:"x",body:"x",status:"draft"}).success).toBe(false);
});
