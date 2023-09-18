const githubHelper = require('./ghHelper');

githubHelper.createReviewPR(undefined, githubHelper.GH_PR_EVENT_APPROVE)
  .catch(error => console.error(`Error sending the request to Github ${error}`));
