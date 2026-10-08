import { beforeEach, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({context:vi.fn(),rpc:vi.fn(),upload:vi.fn(),download:vi.fn(),load:vi.fn(),revalidate:vi.fn()}));
vi.mock("server-only",()=>({}));
vi.mock("next/cache",()=>({revalidatePath:mock.revalidate}));
vi.mock("@/lib/auth-context",()=>({getSchoolContext:mock.context}));
vi.mock("@/lib/document-data",()=>({loadDocuments:mock.load}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({rpc:mock.rpc,storage:{from:()=>({upload:mock.upload,download:mock.download})}})}));
import { uploadDocument,changeDocument } from "../src/app/dashboard/documents/actions";
import { GET } from "../src/app/dashboard/documents/[id]/download/route";
import { inspectPdf } from "../src/lib/document-file";
import { maxPdfBytes } from "../src/lib/document-validation";
const id="00000000-0000-4000-8000-000000000001";
const school="00000000-0000-4000-8000-000000000002";
const pdf=new File(["%PDF-1.7\nFictional test bytes\n%%EOF"],"test.pdf",{type:"application/pdf"});
const state={error:"",saved:false};
function form(changes:Record<string,string>={},file:File=pdf) {
  const result=new FormData();
  for(const [k,v] of Object.entries({mode:"teacher",scope:"class",classId:id,title:" Fictional PDF ",id,version:"1",status:"published",...changes})) result.set(k,v);
  result.set("file",file); return result;
}
const request=(mode="student",child="")=>new Request(`http://127.0.0.1:3000/dashboard/documents/${id}/download?mode=${mode}${child?`&child=${child}`:""}`);
beforeEach(async()=>{
  vi.clearAllMocks();
  mock.context.mockResolvedValue({status:"ready",roles:["teacher"],school:{id:school}});
  mock.rpc.mockImplementation(async(name:string)=>({data:name==="prepare_document"?id:null,error:null}));
  mock.upload.mockResolvedValue({error:null}); mock.download.mockResolvedValue({data:pdf,error:null});
  const inspected=await inspectPdf(pdf);
  mock.load.mockResolvedValue({rows:[{id,title:"Fictional PDF",class_id:id,audience_label:"8A",file_size:pdf.size,sha256:inspected!.sha256,status:"published",record_version:1,can_edit:true}]});
});
it("uses trusted scope, reserves first, uploads without overwrite and finalizes as a draft",async()=>{
  expect(await uploadDocument(state,form({schoolId:"forged"}))).toEqual({error:"",saved:true});
  expect(mock.rpc).toHaveBeenNthCalledWith(1,"prepare_document",expect.objectContaining({target_school:school,target_class:id,new_title:"Fictional PDF",expected_size:pdf.size}));
  expect(mock.upload).toHaveBeenCalledWith(`${school}/${id}.pdf`,expect.any(Buffer),{contentType:"application/pdf",upsert:false,cacheControl:"0"});
  expect(mock.rpc).toHaveBeenLastCalledWith("change_document",expect.objectContaining({new_status:"draft",expected_version:1,target_document:id}));
});
it.each([new File(["hello"],"x.pdf",{type:"application/pdf"}),new File(["%PDF-1.7\n%%EOF"],"x.txt",{type:"text/plain"}),new File([new Uint8Array(maxPdfBytes+1)],"x.pdf",{type:"application/pdf"})])("rejects invalid files before reserving storage",async file=>{
  expect((await uploadDocument(state,form({},file))).saved).toBe(false); expect(mock.rpc).not.toHaveBeenCalled();
});
it("does not silently widen a missing class selection",async()=>{
  mock.context.mockResolvedValue({status:"ready",roles:["school_admin"],school:{id:school}});
  expect((await uploadDocument(state,form({mode:"school_admin",classId:""}))).saved).toBe(false); expect(mock.upload).not.toHaveBeenCalled();
});
it("rejects teacher school-wide scope and forged Admin mode",async()=>{
  expect((await uploadDocument(state,form({scope:"school",classId:""}))).saved).toBe(false);
  expect((await uploadDocument(state,form({mode:"school_admin"}))).saved).toBe(false); expect(mock.rpc).not.toHaveBeenCalled();
});
it("keeps failed uploads unfinished and never publishes them",async()=>{
  mock.upload.mockResolvedValue({error:{message:"private detail"}});
  const result=await uploadDocument(state,form()); expect(result.saved).toBe(false); expect(result.error).toContain("unfinished");
  expect(result.error).not.toContain("private detail"); expect(mock.rpc).toHaveBeenCalledTimes(1);
});
it("does not overwrite or delete a file after an ambiguous finalization failure",async()=>{
  mock.rpc.mockImplementation(async(name:string)=>name==="prepare_document"?{data:id,error:null}:{error:{code:"42501"}});
  expect((await uploadDocument(state,form())).saved).toBe(false); expect(mock.upload).toHaveBeenCalledTimes(1);
});
it("checks the stored file hash before publication",async()=>{
  mock.download.mockResolvedValue({data:new Blob(["%PDF-1.7\nDifferent bytes\n%%EOF"]),error:null});
  expect((await changeDocument(state,form())).saved).toBe(false); expect(mock.rpc).not.toHaveBeenCalled();
});
it("can withdraw a missing upload without reading its bytes",async()=>{
  expect((await changeDocument(state,form({status:"withdrawn"}))).saved).toBe(true); expect(mock.download).not.toHaveBeenCalled();
});
it("shows stale-write errors without leaking database details",async()=>{
  mock.rpc.mockResolvedValue({error:{code:"40001",message:"private detail"}});
  expect((await changeDocument(state,form())).error).toBe("This document changed. Reload before saving.");
});
it("returns an authenticated attachment with private cache headers",async()=>{
  mock.context.mockResolvedValue({status:"ready",roles:["student"],school:{id:school}});
  const response=await GET(request(),{params:Promise.resolve({id})});
  expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("content-disposition")).toContain("attachment;"); expect(response.headers.get("content-type")).toBe("application/pdf");
  expect(await response.text()).toBe(await pdf.text());
});
it("uses the selected guardian grant before accessing storage",async()=>{
  mock.context.mockResolvedValue({status:"ready",roles:["teacher","guardian"],school:{id:school}});
  mock.load.mockResolvedValue({rows:[]});
  expect((await GET(request("guardian",id),{params:Promise.resolve({id})})).status).toBe(404);
  expect(mock.load).toHaveBeenCalledWith(school,"guardian",{edit:id,child:id}); expect(mock.download).not.toHaveBeenCalled();
});
it("rejects invalid download modes, IDs and missing guardian selection",async()=>{
  expect((await GET(request("school_admin"),{params:Promise.resolve({id})})).status).toBe(404);
  expect((await GET(request("teacher"),{params:Promise.resolve({id:"bad"})})).status).toBe(404);
  mock.context.mockResolvedValue({status:"ready",roles:["guardian"],school:{id:school}});
  expect((await GET(request("guardian"),{params:Promise.resolve({id})})).status).toBe(404); expect(mock.download).not.toHaveBeenCalled();
});
it("refuses missing, corrupt and oversized downloads",async()=>{
  mock.context.mockResolvedValue({status:"ready",roles:["student"],school:{id:school}});
  for(const data of [null,new Blob(["bad"]),new Blob([new Uint8Array(maxPdfBytes+1)])]) {
    mock.download.mockResolvedValue({data,error:null}); expect((await GET(request(),{params:Promise.resolve({id})})).status).toBe(404);
  }
});
it("preserves login redirects",async()=>{
  mock.context.mockRejectedValue(new Error("NEXT_REDIRECT"));
  await expect(uploadDocument(state,form())).rejects.toThrow("NEXT_REDIRECT");
  await expect(GET(request(),{params:Promise.resolve({id})})).rejects.toThrow("NEXT_REDIRECT");
});
