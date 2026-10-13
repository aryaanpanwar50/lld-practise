import {Navigation} from "../../../components/Navigation";import {AttemptResult} from "../../../components/AttemptResult";
export default async function AttemptPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <><Navigation/><main className="mx-auto max-w-4xl px-5 py-10"><AttemptResult id={id}/></main></>}
