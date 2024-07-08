const { dockStart } = require('@nlpjs/basic');
const fs = require('fs');


(async () => {
  const dock = await dockStart({
    settings: {
      nlp: {
        forceNER: true,
        languages: ["en"],
        corpora: [
          "src/corpus.json",
        ],
      }
    },
    use: ["Basic", "LangEn"],
  });

  // Get the nlp manager
  const nlp = dock.get('nlp');

  // Train the neural network
  await nlp.train();

  // Save model
  nlp.save("./build/model.nlp");

  // Make js with model string for dissemination
  // Saving is async but does not offer a callback...
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  await sleep(300).then(() => {
    let modelString = fs.readFileSync("./build/model.nlp", "utf-8");
    console.log(modelString);
    const modelStringJS = 'const modelString = String.raw`' + modelString + '`\nmodule.exports = modelString';
    fs.writeFileSync(
      "./build/modelString.js", modelStringJS,
    )
  })
})();

