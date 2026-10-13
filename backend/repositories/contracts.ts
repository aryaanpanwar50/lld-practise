import type {Prisma} from "../generated/prisma/client";
export type EvaluationPersistenceInput={strengths:Prisma.InputJsonValue;issues:Prisma.InputJsonValue;suggestions:Prisma.InputJsonValue;scoreBreakdown?:Prisma.InputJsonValue;totalScore:number|null;evaluatedBy:string[];evaluatedAt:Date};
export interface AttemptRepository {
 claimEvaluation(id:string,userId:string,token:string,now:Date):Promise<boolean>;
 loadForEvaluation(id:string):Promise<{submission:unknown;problem:{title:string;description:string;requirements:string[];constraints:string[];checklist:string[];rubric:unknown}}>;
 completeEvaluation(id:string,userId:string,token:string,result:EvaluationPersistenceInput):Promise<unknown>;
 markEvaluationFailed(id:string,userId:string,token:string,code:string,message:string):Promise<boolean>;
}
export interface ProblemRepository {findById(id:string):Promise<unknown>}
