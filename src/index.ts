import './assets/styles/main.scss';

import {editor} from 'monaco-editor/esm/vs/editor/editor.api';

import TSTLWorker = require('worker-loader!./tstlWorker');

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('example-ts');
  const exampleLua = document.getElementById('example-lua');

  let example = `class Greeter {
    greeting: string;
    constructor(message: string) {
        this.greeting = message;
    }
    greet() {
        return "Hello, " + this.greeting;
    }
  }
  
  let greeter = new Greeter("world");
  
  let button = document.createElement('button');
  button.textContent = "Say Hello";
  button.onclick = function() {
    alert(greeter.greet());
  }
  
  document.body.appendChild(button);
  `;
  
  var queryStringSrcStart = window.location.hash.indexOf("#src=");
  if (queryStringSrcStart == 0) {
    var encoded = window.location.hash.substring("#src=".length);
    example = decodeURIComponent(encoded);
  }

  if (container && exampleLua) {
    let tsEditor = editor.create(container, {
      value: example,
      language: 'typescript',
      minimap: {enabled: false},
      theme: 'vs-dark',
    });

    let luaEditor = editor.create(exampleLua, {
      value: '',
      language: 'lua',
      minimap: {enabled: false},
      theme: 'vs-dark',
      readOnly: true
    });

    window.onresize = () => {
      tsEditor.layout();
      luaEditor.layout();
    }

    const tstlWorker = new (TSTLWorker as any)();
    tstlWorker.postMessage({tsStr: tsEditor.getValue()});

    let timerVar: any;
    let ignoreHashChange = false;

    tsEditor.onDidChangeModelContent((e => {
      clearInterval(timerVar);
      // wait one second before submitting work
      timerVar = setTimeout(() => {
        tstlWorker.postMessage({tsStr: tsEditor.getValue()});
        window.location.hash = "#src=" + encodeURIComponent(tsEditor.getValue());
        ignoreHashChange = true;
      }, 500);      
    }))

    window.onhashchange = () => {
      if (ignoreHashChange) {
        ignoreHashChange = false;
        return;
      }
    }

    tstlWorker.onmessage = (event: MessageEvent) => {
      luaEditor.setValue(event.data.luaStr);
    }
  }
});