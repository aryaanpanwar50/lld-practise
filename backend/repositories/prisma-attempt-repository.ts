import type {PrismaClient} from "../generated/prisma/client";import type {AttemptRepository,EvaluationPersistenceInput,ProblemRepository} from "./contracts";
export class PrismaAttemptRepository implements AttemptRepository{
 constructor(private readonly client:PrismaClient){}
 async claimEvaluation(id:string,userId:string,token:string,now:Date){const result=await this.client.attempt.updateMany({where:{id,userId,OR:[{status:"SUBMITTED"},{status:"FAILED"},{status:"EVALUATING",evaluationStartedAt:{lt:new Date(now.getTime()-120_000)}}]},data:{status:"EVALUATING",evaluationStartedAt:now,evaluationToken:token,failureCode:null,failureMessage:null}});return result.count>0}
 loadForEvaluation(id:string){return this.client.attempt.findUniqueOrThrow({where:{id},include:{problem:true}})}
 async completeEvaluation(id:string,userId:string,token:string,result:EvaluationPersistenceInput){
  return this.client.$transaction(async tx=>{const owns=await tx.attempt.updateMany({where:{id,userId,status:"EVALUATING",evaluationToken:token},data:{status:"COMPLETED",evaluationToken:null,evaluationStartedAt:null}});if(!owns.count)throw Object.assign(new Error("A newer evaluation owns this attempt."),{code:"EVALUATION_SUPERSEDED"});await tx.evaluationResult.upsert({where:{attemptId:id},create:{attemptId:id,...result},update:result});return tx.attempt.findUniqueOrThrow({where:{id},include:{evaluationResult:true}})});
 }
 async markEvaluationFailed(id:string,userId:string,token:string,code:string,message:string){const r=await this.client.attempt.updateMany({where:{id,userId,status:"EVALUATING",evaluationToken:token},data:{status:"FAILED",evaluationToken:null,evaluationStartedAt:null,failureCode:code,failureMessage:message}});return r.count>0}
}
