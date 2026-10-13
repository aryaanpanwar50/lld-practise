import type {PrismaClient} from "../generated/prisma/client";import type {ProblemRepository} from "./contracts";
export class PrismaProblemRepository implements ProblemRepository{constructor(private readonly client:PrismaClient){}findById(id:string){return this.client.problem.findUnique({where:{id}})}}
