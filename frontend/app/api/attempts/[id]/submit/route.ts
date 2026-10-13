import {ApiError,errorJson} from "../../../../../lib/platform";
export async function POST(){return errorJson(new ApiError(410,"LEGACY_ROUTE","Submit drafts through /api/drafts/:id/submit."))}