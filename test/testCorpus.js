const { dockStart } = require('@nlpjs/basic');
let { questionsGroups } = require("./testQuestions.js");

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

const preProcess = (utterance) => {
  // list of features with ", " -> remove the space and multiple spaces
  utterance = utterance.replaceAll(" and ", ",")
                       .replaceAll(",,", ",")
                       .replaceAll(", ", ",")
                       .replaceAll(/ +/g, " ");

  // cell types with spaces are taken care of in the corpus

  return utterance;
};

const postProcess = (response) => {

  let newEntities;

  // organism has a fallback regex, which is a little too generic
  if (response.intent.startsWith("explore.organism")) {
    newEntities = [];
    let organismEntities = []
    for (let i = 0; i < response.entities.length; i++) {
      const entity = response.entities[i];
      if (entity['entity'] === "organism") {
        if (entity["alias"] === undefined) {
          newEntities.push(entity);
        } else if (entity["option"] !== undefined) {
          newEntities.push(entity);
        }
      } else {
        newEntities.push(entity);
      }
    }
    response.entities = newEntities;
  }

  // highest expressor with a specific organ becomes average expression in that organ
  // NOTE: I tried to do this by training but it's hard, good enough for now
  if (response.intent.startsWith("highest_measurement")) {
    for (let i = 0; i < response.entities.length; i++) {
      const entity = response.entities[i];
      if (entity['entity'] == "organ") {
        response.intent = response.intent.replace("highest_measurement", "average");
        break;
      }
    }
  }

  // celltype and celltypeEnum are the same entity, it's just a hack
  // needed because although multiple entries for the same thing work in node,
  // they seem to be broken in the browser version (??)
  let foundCelltypeEnum = false;
  for (let i = 0; i < response.entities.length; i++) {
    const entity = response.entities[i];
    if (entity['entity'] === "celltypeEnum") {
      entity['entity'] = "celltype";
      foundCelltypeEnum = true;
      break;
    }
  }
  if (foundCelltypeEnum) {
    for (let i = 0; i < response.entities.length; i++) {
      const entity = response.entities[i];
      if ((entity['entity'] == "celltype") && (entity['type'] === 'regex')) {
        response.entities.splice(i, i);
        break;
      }
    }
  }

  // Sometimes people write "radial glia cells" but they just mean "radial glia", cut " cells"
  for (let i = 0; i < response.entities.length; i++) {
    const entity = response.entities[i];
    if ((entity['entity'] == "celltype") && (entity['type'] === 'regex') && (entity['sourceText'].endsWith(" cells"))) {
      const ctlength = entity['sourceText'].length;
      entity['sourceText'] = entity['sourceText'].slice(0, ctlength - (" cells").length);
    }
  }

  // smooth muscle et al.: the "muscle" gets recognised as an organ. Fix that
  let entitiesForDeletion = [];
  newEntities = [];
  for (let i = 0; i < response.entities.length; i++) {
    const entity = response.entities[i];
    if ((entity['entity'] == "celltype") && (entity['sourceText'].includes("muscle"))) {
      entitiesForDeletion.push(["organ", "muscle"]);
      break
  } else if ((entity['entity'] == "celltype")) {
     //console.log(entity);
    }
  };
  for (let i = 0; i < response.entities.length; i++) {
    const entity = response.entities[i];
    let keep = true;
    for (let j = 0; j < entitiesForDeletion.length; j++) {
      let keyFD = entitiesForDeletion[j][0];
      let valueFD = entitiesForDeletion[j][1];
      if ((entity['entity'] == keyFD) && (entity['sourceText'] == valueFD)) {
        keep = false;
        break;
      }
    };
    if (keep)
      newEntities.push(entity);
  }
  response.entities = newEntities;

  // there are semantic variations for "these genes", standardise a bit
  for (let i = 0; i < response.entities.length; i++) {
    const entity = response.entities[i];
    if (entity['entity'] !== "features")
      continue;
    const srcTxt = entity['sourceText'];
    if (['these genes', 'these features', 'this gene', 'this feature'].includes(srcTxt)) {
      response.entities[i]['sourceText'] = "these genes";
    }
  }
}


(async () => {
  const dock = await dockStart({
    settings: {
      nlp: {
        forceNER: true,
        languages: ['en'],
        corpora: ["src/corpus.json"],
      },
    },
    use: ['Basic', 'LangEn'],
  });

  const manager = dock.get('nlp');

  // Train the network
  await manager.train();

  // Create a function to interact with the bot
  async function ask(question, context = {}) {
    question = preProcess(question);

    let response = await manager.process("en", question, context);

    let nAnswers = response.answers.length;
    if (nAnswers > 0) {
      response.answer = response.answers[getRandomInt(0, nAnswers)]["answer"];      
    }

    postProcess(response);

    return response;

    // Check if there are slotFill, in which case the question is not well posed
    if (response.slotFill) {
        return response.answer;
    }

    return response.answer;
  }

  // If questions are put to the script, answer them. Otherwise use test questions
  if ((process.argv.length >= 3) && (process.argv[2] != "")) {
    questionsGroups = [
      {"questions": [process.argv[2]], "intent": process.argv[3]},
    ];
    console.log(process.argv);
  }

  async function testGroup(questions, intent, entities = {}, context = {}, debug = false, log = false) {
    if (typeof questions === 'string' || questions instanceof String) {
      questions = [questions];
    }
    if (debug)
      console.log("--------------------------------------------");
    for (let i = 0; i < questions.length; i++) {
      let question = questions[i];
      if (debug)
        console.log(question);
      let response = await ask(question, context);

      // Check intent
      if (response.intent != intent) {
        if (debug) {
          console.log(response);
          console.log("WRONG INTENT: not " + intent);
          console.log("--------------------------------------------");
        }
        return false;
      }

      // Check unfilled slots
      if ((response.slotFill) && (i == questions.length - 1)) {
        if (debug) {
          console.log(response);
          console.log("--------------------------------------------");
          console.log("SLOTS NOT FILLED");
        }
        return false;
      }

      // Check wrong entities
      for (let je = 0; je < response.entities.length; je++) {
        const entity = response.entities[je];
        const entityName = entity.entity;
        let entityString = entity["sourceText"];
        if ((entity["type"] === "enum") && (entity["option"] !== undefined))
          entityString = entity["option"];
        if ((entities[entityName] !== undefined) && (entities[entityName] != entityString)){
          console.log(response);
          console.log("--------------------------------------------");
          console.log("ENTITY NOT CORRECT: " + entityName + " -> " + entityString);
          return false;
        }
      };

      // Check missing entities
      let entityFound;
      for (key in entities) {
        entityFound = false;
        for (let je = 0; je < response.entities.length; je++) {
          const entity = response.entities[je];
          const entityName = entity.entity;
          if (entityName == key) {
            entityFound = true;
            break;
          }
        }

        if ((entityFound == false) && (i == questions.length - 1)) {
          console.log(response);
          console.log("--------------------------------------------");
          console.log("ENTITY MISSING: " + key);
          return false;
        }
      };

      if (log === true) {
        console.log(response);
        console.log("--------------------------------------------");
      }

    }

    return true;
  }


  // Ask and answer questions
  let exit = false;
  for (let k = 0; k < questionsGroups.length; k++) {
    console.log("############################################");
    console.log("Group " + (k+1));
    // NOTE: Each question group resets the context
    let context = {};
    let { questions, intent, entities, log } = questionsGroups[k];
    exit = !await testGroup(questions, intent, entities, context, debug = true, log);
    if (!exit) {
      console.log("--------------------------------------------");
      console.log("OK");
    } else {
      console.log("############################################");
      break;
    }
  }

})();
