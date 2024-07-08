define([
    'base/js/namespace',
    'base/js/events'
    ], function(Jupyter, events) {
            var askChatbot =  function() {

               // containerBootstrap is needed for webpack and similar browser envs
               // dock works in nodejs though. The hierarchy of objects is a little
               // fuzzy from the nlpjs v4 docs, so let's leave this as is for now.
               const { containerBootstrap } = require('@nlpjs/core');
               const { Nlp } = require('@nlpjs/nlp');
               const { LangEn } = require('@nlpjs/lang-en-min');
               const modelString = require('./modelString.js');
               const trainingUtterances = require('./utterances.js'); 
               
               let debug = true;
               
               const preProcess = (utterance) => {
                 return utterance;
               }
               
               const postProcess = (response) => {
               }
               
               // This is a method class in the CommonJS module, because it needs the manager
               async function ask(question) {
                   // This function is only used after window.nlpManager has been set
                   const manager = this.nlpManager || window.nlpManager;
               
                   // Pre-process request (remove spaces after comma, etc)
                   question = preProcess(question);
               
                   let response = await manager.process("en", question, this.context);
               
                   // Post-process response in a few cases
                   postProcess(response);
               
                   if (debug)
                       console.log(response);
               
                   // Check if there are slotFill, in which case the question is not complete
                   if (response.slotFill) {
                       return {
                           complete: false,
                           intent: response.intent,
                           followUpQuestion: response.answer,
                       };
                   }
               
                   // Otherwise, the question is complete, ready for API call by the caller
                   return {
                       complete: true,
                       intent: response.intent,
                       entities: response.entities,
                   }
               };
               
               
               function AtlasApproxNlp(context = {}) {
                 this.initialised = false;
                 this.context = context;
               }
               
               AtlasApproxNlp.prototype = {
                 async initialise() {
                   if (this.initialised == true)
                     return this;
               
                   // Initialise nlpjs
                   const container = await containerBootstrap();
                   container.use(Nlp);
                   container.use(LangEn);
                   const manager = container.get('nlp');
                   //manager.forceNER = true;
                   
                   // Import the model into manager
                   // NOTE: this is a horrible hack, but hey
                   await manager.import(modelString);
               
                   this.nlpManager = manager;
                   this.ask = ask.bind(this);
               
                   this.initialised = true;
               
                   return this;
                 },
               
                 reset() {
                   this.context = {};
                   return this;
                 }
               }


                let chatBot = JupyterNLP();
                chatbot.initialise();

                // TODO: pipe in the question
                let answer = chatbot.ask(question);
                // TODO: pipeout the answer
            };

        var load_ipython_extension = function () {
            Jupyter.toolbar.add_buttons_group([
                /*
                 * Button to run chatbot
                 */
                Jupyter.keyboard_manager.actions.register ({
                     'help'   : 'Run chatbot on this cell',
                     'icon'   : 'fa-search-plus',
                     'handler': function () {
                        $( document ).ready(askChatbot());
                     }
                }, 'run-chatbot', 'run_chatbot'),
            ]);
        };
        return {
            load_ipython_extension : load_ipython_extension
        };
});
