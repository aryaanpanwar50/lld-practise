import {db,errorJson} from "../../../lib/platform";
export async function GET(){try{const p=await db();return Response.json({problems:await p.problem.findMany({orderBy:{title:"asc"},select:{id:true,slug:true,title:true,description:true,difficulty:true,tags:true}})})}catch(e){return errorJson(e)}}
