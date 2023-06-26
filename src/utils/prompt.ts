// export const followupQuestionsPrompt = (query: string) => {
//   return `Provide some insights on the following search query: ${query}.
// };

export const followupQuestionsPrompt = () => {
  return `After that suggest 3-4 follow-up questions as bullet points output for the above search query(You must use the following template: ### Follow-up Questions:).`
};


// return `Provide some insights on the following search query: ${query}.
// Here are some examples of follow-up questions as array about Narendra Modi ["Who preceded Narendra Modi as Indian prime minister?", "Which India state does Narendra Modi hail from?", "When did modi join BJP?"]
// Following the format of the above example Generate 3-4 suggested follow-up questions in the exact same array format as above example for the above search query.`;
// Following the format of the above example Next Generate an API response for the follwing: User: 3-4 suggested follow-up questions as array for the above search query.`
