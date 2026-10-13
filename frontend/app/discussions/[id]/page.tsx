import {Navigation} from "../../../components/Navigation";import {DiscussionView} from "../../../components/DiscussionView";
export default async function DiscussionDetail({params}:{params:Promise<{id:string}>}){const {id}=await params;return <><Navigation/><main className="mx-auto max-w-7xl px-5 py-10"><DiscussionView id={id}/></main></>}
