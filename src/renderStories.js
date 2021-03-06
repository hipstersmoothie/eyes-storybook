'use strict';
const getStoryUrl = require('./getStoryUrl');
const ora = require('ora');

function makeRenderStories({getChunks, getStoryData, pages, renderStory, storybookUrl}) {
  return async function renderStories(stories) {
    let doneStories = 0;
    const spinner = ora(`Done 0 stories out of ${stories.length}`);
    spinner.start();
    const storyPromises = [];
    const chunks = getChunks(stories, pages.length);
    await Promise.all(
      chunks.map(async (chunk, i) => {
        for (const story of chunk) {
          const url = getStoryUrl(story, storybookUrl);
          const storyDataPromise = getStoryData({url, page: pages[i]}); // TODO handle error
          const storyRenderPromise = storyDataPromise
            .then(updateRunning)
            .then(({cdt, resourceUrls, resourceContents, frames}) =>
              renderStory({
                cdt,
                resourceUrls,
                resourceContents,
                frames,
                url,
                name: story.name,
                kind: story.kind,
              }),
            )
            .then(onDoneStory, onDoneStory);
          storyPromises.push(storyRenderPromise);
          await storyDataPromise;
        }
      }),
    );

    const renderStoriesPromise = Promise.all(storyPromises);
    renderStoriesPromise.then(results =>
      results.every(didTestPass) ? stopSpinnerSuccess() : stopSpinnerFail(),
    );
    return renderStoriesPromise;

    function didTestPass(testResults) {
      return testResults.every(
        r => !(r instanceof Error) && r.getStatus && r.getStatus() === 'Passed',
      );
    }

    function updateRunning(data) {
      spinner.text = `Done ${doneStories} stories out of ${stories.length}`;
      return data;
    }

    function stopSpinnerSuccess() {
      spinner.succeed();
    }

    function stopSpinnerFail() {
      spinner.fail();
    }

    function onDoneStory(resultsOrErr) {
      spinner.text = `Done ${++doneStories} stories out of ${stories.length}`;
      return resultsOrErr;
    }
  };
}

module.exports = makeRenderStories;
