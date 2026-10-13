import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { z } from "zod";
import { cookies } from "next/headers";
import { authSessionSecret, SESSION_COOKIE, verifySessionToken } from "../../backend/auth/google-oauth";
import { ApiError, db } from "../../backend/runtime";
export { ApiError, db } from "../../backend/runtime";

const currentDirectory = process.cwd();
const workspaceRoot = existsSync(path.join(currentDirectory, "frontend"))
  ? currentDirectory
  : path.resolve(currentDirectory, "..");
loadEnvConfig(workspaceRoot);

export const submissionSchema=z.object({
 classes:z.array(z.object({name:z.string().max(100),kind:z.enum(["class","interface","abstract class","enum"]),responsibilities:z.array(z.string().max(240)).max(20),attributes:z.array(z.string().max(160)).max(30),methods:z.array(z.string().max(160)).max(40)})).max(30),
 relationships:z.array(z.object({from:z.string().max(100),to:z.string().max(100),type:z.enum(["association","aggregation","composition","inheritance","implementation","dependency"]),note:z.string().max(300).optional(),cardinality:z.enum(["one-to-one","one-to-many","many-to-one","many-to-many"]).optional(),fromIndex:z.number().int().min(0).max(29).optional(),toIndex:z.number().int().min(0).max(29).optional(),fromSide:z.enum(["top","right","bottom","left"]).optional(),toSide:z.enum(["top","right","bottom","left"]).optional()})).max(40),
 designNotes:z.string().max(4000),
 files:z.array(z.object({path:z.string().max(180),purpose:z.string().max(400),content:z.string().max(50000).optional(),classes:z.array(z.number().int().min(0).max(29)).max(30).optional()})).max(40).optional(),
 folders:z.array(z.object({path:z.string().max(180),classes:z.array(z.number().int().min(0).max(29)).max(30).optional()})).max(40).optional(),
 layout:z.array(z.object({x:z.number().min(0).max(1200),y:z.number().min(0).max(1000)})).max(30).optional()
});
export const draftSchema=z.object({submission:submissionSchema});
export const createAttemptSchema=z.object({problemId:z.string().uuid(),basedOnAttemptId:z.string().uuid().optional()});
export const commentSchema=z.object({text:z.string().trim().min(1).max(1000)});
export const publishSchema=z.object({note:z.string().max(1000).optional()});
export function routeUuid(value:string,code:string,resource:string){if(!z.string().uuid().safeParse(value).success)throw new ApiError(404,code,resource+" not found.");return value}
export function queryUuid(value:string,field:string){if(!z.string().uuid().safeParse(value).success)throw new ApiError(400,"VALIDATION_ERROR",field+" must be a valid UUID.");return value}
export function problemLookupWhere(value:string){return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)?{id:value}:{slug:value}}

export function errorJson(e:unknown){if(!(e instanceof ApiError)){const x=e instanceof Error?e as Error & {code?:unknown;meta?:unknown;cause?:unknown}:undefined;const detail=x?{name:x.name,message:x.message,code:x.code,meta:x.meta,cause:x.cause instanceof Error?x.cause.message:x.cause}:String(e);const safe=JSON.stringify(detail).replace(/(postgres(?:ql)?:\/\/[^:\s/]+:)[^@\s/]+@/gi,"$1[redacted]@");console.error("[api] unhandled server error",safe);}const err=e instanceof ApiError?e:new ApiError(500,"INTERNAL_ERROR","Something went wrong.");return Response.json({error:{code:err.code,message:err.message}}, {status:err.status});}
export async function currentUser(){
 let secret:string;try{secret=authSessionSecret()}catch{throw new ApiError(503,"AUTH_NOT_CONFIGURED","Set AUTH_SESSION_SECRET on the server.")}
 const jar=await cookies();const id=verifySessionToken(jar.get(SESSION_COOKIE)?.value,secret);if(!id)throw new ApiError(401,"UNAUTHENTICATED","Sign in to continue.");
 const p=await db();const user=await p.user.findUnique({where:{id}});if(!user)throw new ApiError(401,"INVALID_SESSION","Your session is no longer valid. Sign in again.");
 return {id:user.id,email:user.email,name:user.name,pictureUrl:user.pictureUrl};
}
export async function attemptForOwner(id:string,userId:string){
 const p=await db(); const a=await p.attempt.findFirst({where:{id,userId},include:{problem:true,evaluationResult:true,discussion:true}});
 if(!a) throw new ApiError(404,"ATTEMPT_NOT_FOUND","Attempt not found.");
 return {...a,evaluationToken:undefined};
}
export function parseBody<T>(schema:z.ZodType<T>,body:unknown):T {const v=schema.safeParse(body);if(!v.success)throw new ApiError(400,"VALIDATION_ERROR",v.error.issues.map(i=>i.path.join(".")+": "+i.message).join("; "));return v.data;}
export async function jsonBody(req:Request){const length=Number(req.headers.get("content-length")??0);if(length>350000)throw new ApiError(413,"BODY_TOO_LARGE","Request body is too large.");try{return await req.json()}catch{throw new ApiError(400,"INVALID_JSON","Request body must be valid JSON.")}}
