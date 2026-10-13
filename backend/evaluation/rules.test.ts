import {describe,it,expect} from "vitest";import {RuleBasedEvaluator,type Submission} from "./rules";
const c=(name:string,kind="class",methods:string[]=[]):Submission["classes"][number]=>({name,kind,responsibilities:[],attributes:[],methods});
describe("RuleBasedEvaluator",()=>{const run=(s:Submission)=>new RuleBasedEvaluator().evaluate(s);
it("flags undeclared relationship endpoints",()=>{expect(run({classes:[c("Car")],relationships:[{from:"Car",to:"Vehicl",type:"association"}],designNotes:""}).map(x=>x.code)).toContain("UNDECLARED_CLASS")});
it("flags duplicate names ignoring case",()=>{expect(run({classes:[c("Car"),c("car")],relationships:[],designNotes:""}).some(x=>x.code==="DUPLICATE_CLASS"&&x.severity==="major")).toBe(true)});
it("flags implementation to a non-interface",()=>{expect(run({classes:[c("Engine"),c("Car")],relationships:[{from:"Car",to:"Engine",type:"implementation"}],designNotes:""}).some(x=>x.code==="BAD_IMPLEMENTATION")).toBe(true)});
it("keeps isolated classes, unused interfaces, and large classes optional",()=>{const findings=run({classes:[c("Loose"),c("Port","interface"),c("Big","class",Array.from({length:9},(_,i)=>"m"+i))],relationships:[],designNotes:""});expect(findings.map(x=>x.code)).toEqual(expect.arrayContaining(["ISOLATED_CLASS","UNUSED_INTERFACE","LARGE_CLASS"]));expect(findings.filter(x=>["ISOLATED_CLASS","UNUSED_INTERFACE","LARGE_CLASS"].includes(x.code!)).every(x=>x.severity==="optional")).toBe(true)});
it("does not flag a consistent design",()=>{expect(run({classes:[c("Port","interface"),c("Adapter")],relationships:[{from:"Adapter",to:"Port",type:"implementation"}],designNotes:""})).toEqual([])});
});
