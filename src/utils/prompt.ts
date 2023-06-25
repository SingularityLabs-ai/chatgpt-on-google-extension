
export const followupQuestionsPrompt = (query: string) => {
  return `Provide some insights on the following search query: ${query}. Next suggest 3-4 follow-up questions as a python list within a codeblock:`
}
