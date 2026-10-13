import { randomUUID } from "node:crypto";
import { db, ApiError } from "../runtime";
import { RuleBasedEvaluator, type Submission } from "../evaluation/rules";
import { AIEvaluator } from "../evaluation/ai";
import { PrismaAttemptRepository } from "../repositories/prisma-attempt-repository";
import { PrismaProblemRepository } from "../repositories/prisma-problem-repository";
import type { EvaluationPersistenceInput } from "../repositories/contracts";
import { assertCanTransition } from "../domain/attempt";
export async function createDraft(userId:string,problemId:string,basedOnAttemptId?:string){
 const p=await db(); const problem=await new PrismaProblemRepository(p).findById(problemId);if(!problem)throw new ApiError(404,"PROBLEM_NOT_FOUND","Problem not found.");
 const draftKey=basedOnAttemptId?"retry:"+basedOnAttemptId:"active";
 const existing=await p.draft.findUnique({where:{userId_problemId_draftKey:{userId,problemId,draftKey}}});if(existing)return existing;
 let submission={classes:[],relationships:[],designNotes:""} as unknown as Submission;
 if(basedOnAttemptId){const prior=await p.attempt.findFirst({where:{id:basedOnAttemptId,userId,problemId}});if(!prior)throw new ApiError(404,"ATTEMPT_NOT_FOUND","Starting attempt not found.");submission=prior.submission as Submission;}
 try{return await p.draft.create({data:{userId,problemId,basedOnAttemptId,draftKey,submission}})}catch(error){if((error as {code?:string})?.code!=="P2002")throw error;const recovered=await p.draft.findUnique({where:{userId_problemId_draftKey:{userId,problemId,draftKey}}});if(recovered)return recovered;throw error}
}
export async function saveDraft(userId:string,id:string,submission:Submission){
 const p=await db(); const result=await p.draft.updateMany({where:{id,userId},data:{submission,updatedAt:new Date()}});
 if(!result.count)throw new ApiError(404,"DRAFT_NOT_FOUND","Draft not found.");
 return p.draft.findUniqueOrThrow({where:{id}});
}
export async function draftForOwner(userId:string,id:string){
 const p=await db(); const draft=await p.draft.findFirst({where:{id,userId},include:{problem:true}});
 if(!draft)throw new ApiError(404,"DRAFT_NOT_FOUND","Draft not found.");
 return draft;
}
export async function submitAttempt(userId:string,draftId:string,submission:Submission){
 const p=await db(); const draft=await p.draft.findFirst({where:{id:draftId,userId}});if(!draft)throw new ApiError(404,"DRAFT_NOT_FOUND","Draft not found.");
 if(!submission.classes.length||submission.classes.some(c=>!c.name.trim()))throw new ApiError(400,"SUBMISSION_INCOMPLETE","Add at least one class and give every class a name.");
 const submittedAt=new Date();
 return p.attempt.create({data:{userId,problemId:draft.problemId,basedOnAttemptId:draft.basedOnAttemptId,submission,status:"SUBMITTED",submittedAt}});
}
export async function evaluateAttempt(userId:string,id:string){
 const p=await db(); const repository=new PrismaAttemptRepository(p); const token=randomUUID(); const now=new Date();
 const current=await p.attempt.findFirst({where:{id,userId},select:{status:true}});if(!current)throw new ApiError(404,"ATTEMPT_NOT_FOUND","Attempt not found.");if(current.status==="SUBMITTED"||current.status==="FAILED")assertCanTransition(current.status,"EVALUATING");
 const claimed=await repository.claimEvaluation(id,userId,token,now);
 if(!claimed){
  const a=await p.attempt.findFirst({where:{id,userId},include:{evaluationResult:true}});
  if(!a)throw new ApiError(404,"ATTEMPT_NOT_FOUND","Attempt not found.");
  if(a.status==="COMPLETED")return a;
  if(a.status==="EVALUATING")throw new ApiError(409,"EVALUATION_IN_PROGRESS","Evaluation is already in progress.");
  throw new ApiError(409,"NOT_SUBMITTED","Submit this attempt before evaluation.");
 }
 try{
  const a=await repository.loadForEvaluation(id);
  const submission=a.submission as unknown as Submission;
  const rules=new RuleBasedEvaluator().evaluate(submission);
  const rubric=a.problem.rubric as {criterion:string;description:string}[];
  const ai=await new AIEvaluator().evaluate({problem:{title:a.problem.title,description:a.problem.description,requirements:a.problem.requirements,constraints:a.problem.constraints,checklist:a.problem.checklist,rubric},submission,ruleFindings:rules});
  const result={strengths:ai.strengths,issues:[...rules,...ai.issues],suggestions:ai.suggestions,scoreBreakdown:ai.scoreBreakdown??undefined,totalScore:ai.totalScore,evaluatedBy:["rule-based","ai"],evaluatedAt:new Date()};
  return await repository.completeEvaluation(id,userId,token,result as unknown as EvaluationPersistenceInput);
 }catch(e){
  const code=(e as {code?:string})?.code;
  let markedFailed=false;try{markedFailed=await repository.markEvaluationFailed(id,userId,token,code==="AI_INVALID_RESPONSE"?"AI_INVALID_RESPONSE":code==="AI_UNAVAILABLE"?"AI_UNAVAILABLE":"DATABASE_FAILURE",e instanceof Error?e.message:"Evaluation failed.")}catch{}
  if(e instanceof ApiError)throw e;
  if(code==="EVALUATION_SUPERSEDED")throw new ApiError(409,"EVALUATION_SUPERSEDED","A newer evaluation owns this attempt.");
  if(code==="AI_INVALID_RESPONSE")throw new ApiError(502,"AI_INVALID_RESPONSE","The evaluation provider returned feedback that could not be safely validated.");
  if(code==="AI_UNAVAILABLE")throw new ApiError(502,"AI_UNAVAILABLE","Evaluation could not finish. Your submission is safe; retry when ready.");
  throw new ApiError(503,"EVALUATION_PERSISTENCE_FAILED",markedFailed?"The evaluation result could not be saved. The attempt is marked failed and can be retried.":"The database could not persist evaluation state. The attempt may remain evaluating and can be recovered after the stale-claim timeout.");
 }
}
