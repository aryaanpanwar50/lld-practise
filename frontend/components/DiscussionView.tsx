/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import {useCallback,useEffect,useState} from "react";
import type {FormEvent} from "react";
import {ClassDiagramCanvas} from "./ClassDiagramCanvas";
import {FileStructureEditor} from "./FileStructureEditor";
import type {DesignState} from "./designTypes";
import type {DiscussionViewData} from "../lib/view-types";

export function DiscussionView({id}:{id:string}){
 const [d,setD]=useState<DiscussionViewData|null>(null),[text,setText]=useState(""),[error,setError]=useState(""),[loading,setLoading]=useState(true),[tab,setTab]=useState<"diagram"|"files"|"notes">("diagram");
 const load=useCallback(async()=>{const r=await fetch("/api/discussions/"+id),j=await r.json() as {discussion:DiscussionViewData;error?:{message:string}};if(!r.ok)throw Error(j.error?.message);setD(j.discussion)},[id]);
 useEffect(()=>{load().catch(e=>setError(e.message)).finally(()=>setLoading(false))},[load]);
 async function comment(e:FormEvent){e.preventDefault();setError("");const r=await fetch("/api/discussions/"+id+"/comments",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({text})}),j=await r.json() as {comment:{id:string};error?:{message:string}};if(!r.ok){setError(j.error?.message??"Unable to post comment.");return}setText("");await load()}
 if(loading)return <p>Loading discussion…</p>;
 if(!d)return <p role="alert">{error||"Discussion not found."}</p>;
 const snapshot:DesignState={...d.attempt.submission,files:d.attempt.submission.files??[],folders:d.attempt.submission.folders??[],layout:d.attempt.submission.layout??[]};
 const noChange=()=>{};
 return <div className="space-y-6">
  <header className="rounded-2xl border bg-white p-6"><p className="text-sm text-indigo-700">{d.attempt.problem.title} · by {d.attempt.user.name}</p><h1 className="mt-2 text-3xl font-bold">Design discussion</h1>{d.note&&<p className="mt-3 text-slate-600">{d.note}</p>}</header>
  <section className="overflow-hidden rounded-2xl border bg-white">
   <div className="flex items-center gap-1 border-b border-slate-200 px-4"><button onClick={()=>setTab("diagram")} className={"border-b-2 px-4 py-3 text-sm font-semibold "+(tab==="diagram"?"border-indigo-600 text-indigo-700":"border-transparent text-slate-500")}>Class diagram</button><button onClick={()=>setTab("files")} className={"border-b-2 px-4 py-3 text-sm font-semibold "+(tab==="files"?"border-indigo-600 text-indigo-700":"border-transparent text-slate-500")}>Code editor</button>{snapshot.designNotes&&<button onClick={()=>setTab("notes")} className={"border-b-2 px-4 py-3 text-sm font-semibold "+(tab==="notes"?"border-indigo-600 text-indigo-700":"border-transparent text-slate-500")}>Design notes</button>}<span className="ml-auto text-xs text-slate-400">Published snapshot</span></div>
   {tab==="diagram"&&<div className="h-[620px]"><ClassDiagramCanvas submission={snapshot} setSubmission={noChange} undo={noChange} redo={noChange} readOnly/></div>}
   {tab==="files"&&<div className="h-[620px]"><FileStructureEditor submission={snapshot} setSubmission={noChange} readOnly/></div>}
   {tab==="notes"&&<div className="min-h-48 whitespace-pre-wrap p-6 text-sm leading-6 text-slate-700">{snapshot.designNotes}</div>}
  </section>
  <section><h2 className="text-xl font-semibold">Comments ({d.comments.length})</h2><div className="mt-3 space-y-3">{d.comments.map(c=><article key={c.id} className="rounded-xl border bg-white p-4"><p className="font-semibold">{c.author.name}</p><p className="mt-1 whitespace-pre-line text-slate-700">{c.text}</p></article>)}</div><form onSubmit={comment} className="mt-5 space-y-3"><textarea required maxLength={1000} value={text} onChange={e=>setText(e.target.value)} rows={3} placeholder="Add a constructive comment" className="w-full rounded-xl border bg-white p-3"/>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}<button className="rounded-full bg-slate-950 px-5 py-3 text-white">Post comment</button></form></section>
 </div>
}