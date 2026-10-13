"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {AuthButton} from "./AuthButton";

export function Navigation(){
 const pathname=usePathname();
 const [signedIn,setSignedIn]=useState<boolean|null>(null);
 const router=useRouter();
 useEffect(()=>{fetch((process.env.NEXT_PUBLIC_BACKEND_URL??"http://localhost:4000")+"/api/auth/me",{credentials:"include"}).then(response=>setSignedIn(response.ok)).catch(()=>setSignedIn(false))},[]);
 const inWorkspace=pathname.endsWith("/new")||pathname.endsWith("/edit");
 const trigger=(action:"save-draft"|"submit-design")=>window.dispatchEvent(new Event("lld:"+action));
 return <header className="border-b border-slate-200 bg-white/95">
  <div className="flex w-full items-center gap-6 px-5 py-3 lg:px-7">
   <Link href="/" onClick={e=>{e.preventDefault();if(signedIn!==null){router.push(signedIn?"/problems":"/");return}fetch((process.env.NEXT_PUBLIC_BACKEND_URL??"http://localhost:4000")+"/api/auth/me",{credentials:"include"}).then(response=>router.push(response.ok?"/problems":"/")).catch(()=>router.push("/"))}} className="shrink-0 font-bold tracking-tight text-slate-950">LLD Practice</Link>
   <nav className="flex items-center gap-4 text-sm text-slate-600 sm:gap-5"><Link href="/problems">Problems</Link><Link href="/history">My attempts</Link><Link href="/discussions">Community</Link></nav>
   <div className="ml-auto flex items-center gap-2">
    {inWorkspace&&<><button onClick={()=>trigger("save-draft")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:px-4 sm:text-sm">Save draft</button><button onClick={()=>trigger("submit-design")} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 sm:px-4 sm:text-sm">Submit design</button></>}
    {!inWorkspace&&!pathname.startsWith("/problems/")&&<AuthButton/>}
   </div>
  </div>
 </header>
}