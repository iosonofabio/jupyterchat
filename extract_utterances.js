fs = require('fs');

// parse training json
let obj = JSON.parse(fs.readFileSync('src/corpus.json', 'utf8'));

// extract training utterances
let utterances = [];
obj.data.forEach((item) => {
  utterances = utterances.concat(item.utterances);
});

// prepare js decoration
let content = 'const trainingUtterances = [\n  "' + utterances.join('",\n  "') + '"\n];';
content += '\n';
content += 'module.exports = trainingUtterances'


// store everything to file
fs.writeFileSync('build/utterances.js', content);
