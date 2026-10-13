export type DesignClass = {name:string;kind:string;responsibilities:string[];attributes:string[];methods:string[]};
export type DesignRelationship = {from:string;to:string;type:string;note?:string};
export type Submission = {classes:DesignClass[];relationships:DesignRelationship[];designNotes:string;files?:{path:string;purpose:string}[];layout?:{x:number;y:number}[]};
export type Finding = {source:"rule-based"|"ai";severity:"major"|"minor"|"optional";code?:string;title:string;explanation:string;evidence:string};
const norm=(s:string)=>s.trim().toLowerCase();
export class RuleBasedEvaluator {
 evaluate(submission:Submission):Finding[] {
  const out:Finding[]=[]; const byName=new Map<string,DesignClass[]>();
  for(const c of submission.classes){const k=norm(c.name);byName.set(k,[...(byName.get(k)??[]),c]);}
  for(const group of byName.values()) if(group.length>1) out.push({source:"rule-based",severity:"major",code:"DUPLICATE_CLASS",title:"Duplicate class name",explanation:"Class name “"+group[0].name+"” is declared more than once (names are case-insensitive).",evidence:group.map(c=>c.name).join(", ")});
  const declared=new Map(submission.classes.map(c=>[norm(c.name),c]));
  for(const r of submission.relationships) for(const end of [r.from,r.to]) if(!declared.has(norm(end))) out.push({source:"rule-based",severity:"major",code:"UNDECLARED_CLASS",title:"Relationship uses an undeclared class",explanation:"Relationship endpoint “"+end+"” is not declared in the class list.",evidence:r.from+" —"+r.type+"→ "+r.to});
  for(const r of submission.relationships) if(norm(r.type)==="implementation") {const target=declared.get(norm(r.to)); if(target&&norm(target.kind)!=="interface") out.push({source:"rule-based",severity:"major",code:"BAD_IMPLEMENTATION",title:"Implementation target is not an interface",explanation:"“"+r.to+"” is declared as "+target.kind+", while this relationship is marked implementation.",evidence:r.from+" —implementation→ "+r.to});}
  const linked=new Set(submission.relationships.flatMap(r=>[norm(r.from),norm(r.to)]));
  for(const c of submission.classes) {
   if(!linked.has(norm(c.name))) out.push({source:"rule-based",severity:"optional",code:"ISOLATED_CLASS",title:"Worth a look: isolated class",explanation:"This class is not connected to any declared relationship. That can be intentional, so review it in context.",evidence:c.name});
   if(norm(c.kind)==="interface"&&!submission.relationships.some(r=>norm(r.type)==="implementation"&&norm(r.to)===norm(c.name))) out.push({source:"rule-based",severity:"optional",code:"UNUSED_INTERFACE",title:"Worth a look: unused interface",explanation:"No class currently implements this interface. This may be intentional for a planned extension.",evidence:c.name});
   if(c.methods.length>8) out.push({source:"rule-based",severity:"optional",code:"LARGE_CLASS",title:"Worth a look: many methods",explanation:"This class declares "+c.methods.length+" methods (the heuristic threshold is more than 8).",evidence:c.name+": "+c.methods.join(", ")});
  }
  return out;
 }
}
