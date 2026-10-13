import { ChatGoogle } from "@langchain/google";
import { z } from "zod";
import type { Finding, Submission } from "./rules.js";
const writtenSchema=z.object({
 strengths:z.array(z.object({title:z.string().min(1).max(120),detail:z.string().min(1).max(1200)})).max(12),
 issues:z.array(z.object({severity:z.enum(["major","minor","optional"]),title:z.string().min(1).max(160),explanation:z.string().min(1).max(1500),evidence:z.string().min(1).max(500)})).max(20),
 suggestions:z.array(z.object({title:z.string().min(1).max(160),detail:z.string().min(1).max(1200)})).max(12),
 acknowledgesMultipleValidDesigns:z.literal(true),
 replacementSolution:z.literal(false),
 scoreBreakdown:z.unknown().optional()
}).strict();
// Gemini rejects highly constrained JSON schemas. This schema enforces the response shape;
 // writtenSchema below remains the strict application-side validator.
const providerSchema=z.object({
 strengths:z.array(z.object({title:z.string(),detail:z.string()})),
 issues:z.array(z.object({severity:z.string(),title:z.string(),explanation:z.string(),evidence:z.string()})),
 suggestions:z.array(z.object({title:z.string(),detail:z.string()})),
 acknowledgesMultipleValidDesigns:z.boolean(),
 replacementSolution:z.boolean(),
 scoreBreakdown:z.array(z.object({criterion:z.string(),score:z.number(),comment:z.string()}))
});
const scoreSchema=z.array(z.object({criterion:z.string().min(1),score:z.number().int().min(0).max(5),comment:z.string().max(800)}));
export type ProblemInput={title:string;description:string;requirements:string[];constraints:string[];checklist:string[];rubric:{criterion:string;description:string}[]};
export type AIInput={problem:ProblemInput;submission:Submission;ruleFindings:Finding[]};
export type AIOutput={strengths:{title:string;detail:string}[];issues:({severity:"major"|"minor"|"optional";title:string;explanation:string;evidence:string;source:"ai"})[];suggestions:{title:string;detail:string}[];scoreBreakdown:{criterion:string;score:number;comment:string}[]|null;totalScore:number|null};
export interface EvaluationStrategy { evaluate(input:AIInput):Promise<AIOutput>; }
const systemPrompt="You are a rigorous but constructive evaluator for a learner's low-level design submission. Evaluate the submitted design only against the supplied problem, requirements, constraints, checklist, rubric, submission, and rule findings.\n\nEvaluation principles:\n1. Treat the submission as an independent design exercise. Multiple designs may be valid. Judge trade-offs and evidence, never conformity to one preferred solution.\n2. Do not invent classes, methods, relationships, requirements, or behavior that are not in the submission. Do not propose a complete replacement solution, class diagram, or implementation.\n3. Every issue must cite exact, verbatim evidence that appears in the serialized submission. If you cannot cite exact evidence, omit the issue.\n4. Prioritize design correctness, ownership, responsibility boundaries, extensibility, state safety, and how well the stated requirements and constraints are addressed.\n5. Be specific and actionable. Explain the design consequence, then suggest a focused improvement without writing the solution for the learner.\n\nSeverity rules for issues:\n- major: a missing or contradictory design decision likely prevents an explicit requirement or constraint from being met.\n- minor: a meaningful ambiguity, coupling concern, incomplete responsibility boundary, or unaddressed edge case.\n- optional: an improvement that could make the design clearer or easier to extend, but does not block stated behavior.\n\nScoring rules:\n- Score every supplied rubric criterion exactly once, using an integer from 0 to 5.\n- 5 = strong, explicit evidence that meets the criterion and considers relevant constraints.\n- 4 = meets the criterion with a small omission or minor ambiguity.\n- 3 = partially meets the criterion; the core intent is present but important detail is missing.\n- 2 = weak support; substantial design reasoning or evidence is absent.\n- 1 = minimal relevant evidence.\n- 0 = no evidence or the submission contradicts the criterion.\n- Score only what is evidenced. Do not lower a score for an alternative design when it satisfies the stated problem.\n- Each score comment must explain the score from observed evidence, in concise language.\n\nFeedback rules:\n- Return 1 to 5 strengths only when they are supported by the submission.\n- Return 0 to 8 issues. Avoid repeating rule findings unless adding new reasoning grounded in the design.\n- Return 1 to 5 suggestions that are prioritized, small in scope, and do not reveal a full solution.\n- Keep titles short and details concrete.\n\nJSON response contract — follow exactly:\n- Output one JSON object and nothing before or after it. Do not use Markdown, code fences, comments, prose, or trailing commas.\n- Use double-quoted JSON keys and strings.\n- Include every key below, even when an array is empty.\n- acknowledgesMultipleValidDesigns must be the boolean true; replacementSolution must be the boolean false.\n- severity must be exactly one of major, minor, or optional.\n- score must be an integer from 0 through 5. Copy each rubric criterion exactly into criterion, once only. If no rubric is supplied, use an empty scoreBreakdown array.\n\nReturn this exact shape (replace the example text with your findings):\n{\n  \"strengths\": [{\"title\": \"Clear responsibility\", \"detail\": \"The submitted ClassName owns the stated responsibility.\"}],\n  \"issues\": [{\"severity\": \"minor\", \"title\": \"Missing state transition\", \"explanation\": \"Why this affects a stated requirement.\", \"evidence\": \"exact text copied from the serialized submission\"}],\n  \"suggestions\": [{\"title\": \"Clarify ownership\", \"detail\": \"A focused next improvement without providing a full solution.\"}],\n  \"acknowledgesMultipleValidDesigns\": true,\n  \"replacementSolution\": false,\n  \"scoreBreakdown\": [{\"criterion\": \"exact rubric criterion text\", \"score\": 3, \"comment\": \"Concise evidence-based reason.\"}]\n}\n\nBefore responding, silently verify the result can be parsed by JSON.parse and contains no keys other than the seven keys shown above.";
const debugEvaluation=process.env.AI_EVALUATION_DEBUG==="true";
const logEvaluation=(event:string,payload:unknown)=>{if(debugEvaluation)console.info("[ai-evaluation] "+event,JSON.stringify(payload));};
const withTimeout=<T>(promise:Promise<T>,ms:number)=>new Promise<T>((resolve,reject)=>{const timer=setTimeout(()=>reject(Object.assign(new Error("AI evaluation timed out."),{code:"AI_UNAVAILABLE"})),ms);promise.then(value=>{clearTimeout(timer);resolve(value)},error=>{clearTimeout(timer);reject(error)})});
export class AIEvaluator implements EvaluationStrategy {
 async evaluate(input:AIInput):Promise<AIOutput>{
  const apiKey=(process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY)?.trim(), model=process.env.LLM_MODEL||"gemini-2.5-flash-lite";
  if(!apiKey) throw Object.assign(new Error("Gemini is not configured. Set GEMINI_API_KEY in the server environment."),{code:"AI_UNAVAILABLE"});
  let parsed:unknown;
  try {
   logEvaluation("request",{model,problemTitle:input.problem.title,classCount:input.submission.classes.length,relationshipCount:input.submission.relationships.length,rubricCount:input.problem.rubric.length});
   const chat=new ChatGoogle({model,apiKey,temperature:0.1,maxRetries:0,maxOutputTokens:1600,thinkingLevel:"low"});
   // This sets Gemini's response MIME type and JSON schema, then returns the parsed object.
   parsed=await withTimeout(chat.withStructuredOutput(providerSchema).invoke([["system",systemPrompt],["human",JSON.stringify(input)]]),25_000);
   logEvaluation("response",{model,receivedObject:typeof parsed==="object"&&parsed!==null});
  } catch(e) {
   const message=e instanceof Error?e.message.slice(0,500):"Gemini request failed";
   logEvaluation("error",{model,message});
   throw Object.assign(new Error("Gemini evaluation failed: "+message),{code:"AI_UNAVAILABLE"});
  }
  const written=writtenSchema.safeParse(parsed);
  if(!written.success){logEvaluation("invalid-schema",{model,issues:written.error.issues});throw Object.assign(new Error("LLM feedback did not satisfy the required safety schema."),{code:"AI_INVALID_RESPONSE"});}
  const serialized=JSON.stringify(input.submission);
  // Only retain AI issues with an exact citation from the saved snapshot. Deterministic findings remain available separately.
  const issues=written.data.issues.filter(issue=>serialized.includes(issue.evidence));
  if(debugEvaluation&&issues.length!==written.data.issues.length)logEvaluation("issues-dropped-for-ungrounded-evidence",{model,dropped:written.data.issues.length-issues.length});
  const candidate=(parsed as {scoreBreakdown?:unknown}).scoreBreakdown; let scoreBreakdown:AIOutput["scoreBreakdown"]=null;
  if(input.problem.rubric.length) { const scores=scoreSchema.safeParse(candidate); const exact=scores.success&&scores.data.length===input.problem.rubric.length&&input.problem.rubric.every(r=>scores.data.filter(s=>s.criterion===r.criterion).length===1); if(exact) scoreBreakdown=scores.data; }
  return {strengths:written.data.strengths,issues:issues.map(i=>({...i,source:"ai" as const})),suggestions:written.data.suggestions,scoreBreakdown,totalScore:scoreBreakdown?.reduce((n,x)=>n+x.score,0)??null};
 }
}
