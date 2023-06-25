
export const getCodeblock = (str:string) => {
    const regex = /```(.*?)```/gs;
    if (str) {
      const matches = [...str.matchAll(regex)];
      const codeBlocks = matches.map(match => match[1]);
      // console.log("codeBlocks", codeBlocks);
      if (codeBlocks && codeBlocks.length > 0) {
        return codeBlocks[0];
      }
    }
    return "";
}

export const getFollowupQuestionFromCodeblock = (str:string) => {
    const regex = /```(.*?)```/gs;
    if (str) {
      const matches = [...str.matchAll(regex)];
      const codeBlocks = matches.map(match => match[1]);
      // console.log("codeBlocks", codeBlocks);
      if (codeBlocks && codeBlocks.length > 0) {
        let followupQuestionArray = JSON.parse(codeBlocks[0].replace('Python','').replace('python',''));
        // console.log("followupQuestionArray", followupQuestionArray);
        return followupQuestionArray;
      }      
    }
    return [];
}