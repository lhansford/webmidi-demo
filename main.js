var api = "http://mighty-falls-7122.herokuapp.com/0/";
var song = "new";

var octave = 4;
var timeStep = 125;
var queue = [];
var processingQueue = false;
var notesDown = [];

var volcaControlChanges = {
  "portamento": 5,
  "detune": 42,
  "cutoff": 44,
  "lfoRate": 46,
  "lfoPitch": 47,
  "lfoCutoff": 48,
  "attack": 49,
  "decay": 50,
  "sustain": 51,
  "delayTime": 52,
  "delayFeedback": 53
};

var symbolToNote = {
  "i": "c",
  "ii": "d",
  "iii": "e",
  "iv": "f",
  "v": "g",
  "vi": "a+",
  "vii": "b+",
}

var noteToSymbol = {
  "c": "i",
  "d": "ii",
  "e": "iii",
  "f": "iv",
  "g": "v",
  "a": "vi",
  "b": "vii",
  "a+": "vi",
  "b+": "vii",
}

var keysToNote = {
  "65": "a",
  "87": "a#",
  "83": "b",
  "68": "c",
  "82": "c#",
  "70": "d",
  "84": "d#",
  "71": "e",
  "72": "f",
  "85": "f#",
  "74": "g",
  "73": "g#",
  "75": "a+",
  "79": "a#+",
  "76": "b+",
};
var numNotes = 12;
var noteToMidiCode = {
  "a": 9,
  "a#": 10,
  "b": 11,
  "c": 12,
  "c#": 13,
  "d": 14,
  "d#": 15,
  "e": 16,
  "f": 17,
  "f#": 18,
  "g": 19,
  "g#": 20,
  "a+": 21,
  "a#+": 22,
  "b+": 23
};

window.onload = function(){
  $("#octave").text(octave);
  $("#play").click(function(){getMelody(api + song)});
  $("#reset").click(function(){
    $.ajax({
      "url": api + song,
      "method": "DELETE"
    }).done(function(){
      console.log("deleted");
    });
  });
  $("#play-original").click(function(){getMelody(api + song + "/raw")});
  $("#stop").click(function(){
    var port = $("#midi-port").val()
    var output = midi.outputs.get(port);
    var channel = 0;
    while(channel < 128){
      output.send([0x80, channel, 0x7f]);
      channel++;
    }
    output.close();
    queue = [];
    keysDown = [];
  });

  $("#song").on("change", function(){
    song = $("#song").val();
  });

  $("#tempo").on("change", function(){
    timeStep = $("#tempo").val();
  });
  $("#detune").on("change", function(){
    setControlChange("detune", $("#detune").val());
  });
  $("#cutoff").on("change", function(){
    setControlChange("cutoff", $("#cutoff").val());
  });
  $("#delay-time").on("change", function(){
    setControlChange("delayTime", $("#delay-time").val());
  });
  $("#delay-feedback").on("change", function(){
    setControlChange("delayFeedback", $("#delay-feedback").val());
  });
  $("#portamento").on("change", function(){
    setControlChange("portamento", $("#portamento").val());
  });
  $("#lfoRate").on("change", function(){
    setControlChange("lfoRate", $("#lfoRate").val());
  });
  $("#lfoPitch").on("change", function(){
    setControlChange("lfoPitch", $("#lfoPitch").val());
  });
  $("#lfoCutoff").on("change", function(){
    setControlChange("lfoCutoff", $("#lfoCutoff").val());
  });
  $("#attack").on("change", function(){
    setControlChange("attack", $("#attack").val());
  });
  $("#decay").on("change", function(){
    setControlChange("decay", $("#decay").val());
  });
  $("#sustain").on("change", function(){
    setControlChange("sustain", $("#sustain").val());
  });

  $(window).on("keyup", function(event) {
    var note = keysToNote[event.keyCode];
    if(note != undefined){
      note = noteToMidi(note, octave);
      if(notesDown.indexOf(note) != -1){
        noteOff(midi, $("#midi-port").val(), noteToMidi(keysToNote[event.which], octave));
        var i = notesDown.indexOf(note);
        notesDown.splice(i, 1);
      }
    }
  });

  $(window).on("keydown", function(event) {
    var key = event.keyCode;
    if (key == "90"){
      // Octave down
      if(octave > 0){
        octave--;
        $("#octave").text(octave);
      }
    }else if(key == "88"){
      // Octave up
      if(octave < 8){
        octave++;
        $("#octave").text(octave);
      }
    }else{
      var note = keysToNote[key];
      if(note != undefined){
        note = noteToMidi(note, octave);
        if(notesDown.indexOf(note) == -1){
          notesDown.push(note);
          if($("#sendToAPI").prop("checked") == true){
            postNote(keysToNote[key]);
          }
          noteOn(midi, $("#midi-port").val(), note);
        }
      }
    }
  });
}

// request MIDI access
if (navigator.requestMIDIAccess) {
  console.log("Starting MIDI");
    navigator.requestMIDIAccess({
        sysex: false // this defaults to 'false' and we won't be covering sysex in this article.
    }).then(onMIDISuccess, onMIDIFailure);
} else {
    alert("No MIDI support in your browser.");
}

// midi functions
function onMIDISuccess(midiAccess) {
    // when we get a succesful response, run this code
    console.log('MIDI Access Object', midiAccess);
    // when we get a succesful response, run this code
    midi = midiAccess; // this is our raw MIDI data, inputs, outputs, and sysex status
    listInputsAndOutputs(midi);
}

function listInputsAndOutputs( midiAccess ) {
  for (var entry of midiAccess.inputs) {
    var input = entry[1];
    // console.log( "Input port [type:'" + input.type + "'] id:'" + input.id +
    //   "' manufacturer:'" + input.manufacturer + "' name:'" + input.name +
    //   "' version:'" + input.version + "'" );
  }

  for (var entry of midiAccess.outputs) {
    var output = entry[1];
    // console.log(output);
    // console.log( "Output port [type:'" + output.type + "'] id:'" + output.id +
    //   "' manufacturer:'" + output.manufacturer + "' name:'" + output.name +
    //   "' version:'" + output.version + "'" );
    $("#midi-port").append("<option value='" + output.id + "'>" + output.id + "</option>");
  }
}

function sendNote( midiAccess, portID, note) {
  var noteOnMessage = [0x90, note, 0x7f];    // note on, middle C, full velocity
  var output = midiAccess.outputs.get(portID);
  output.send( noteOnMessage );  //omitting the timestamp means send immediately.
  output.send( [0x80, note, 0x40], window.performance.now() + 100.0 ); // Inlined array creation- note off, middle C,
  //                                                                     // release velocity = 64, timestamp = now + 1000ms.
}

function noteOn(midiAccess, portID, note) {
  var noteOnMessage = [0x90, note, 0x7f];    // note on, middle C, full velocity
  var output = midiAccess.outputs.get(portID);
  output.send(noteOnMessage);
}

function noteOff(midiAccess, portID, note) {
  var noteOffMessage = [0x80, note, 0x7f];    // note off
  var output = midiAccess.outputs.get(portID);
  output.send(noteOffMessage);
}

function noteToMidi(note, octave){
  return noteToMidiCode[note] + (octave * numNotes);
}

function onMIDIFailure(e) {
    // when we get a failed response, run this code
    console.log("No access to MIDI devices or your browser doesn't support WebMIDI API. Please use WebMIDIAPIShim " + e);
}

function playMelody(melody) {
  var output = midi.outputs.get($("#midi-port").val());
  var time = 0;
  melody = melody.split(" ");
  queue = [];
  for(var i = 0; i < melody.length; i++){
    queue.push(melody[i]);
  }
  if(!processingQueue){
    processQueue();
  }
}
function processQueue(){
  var output = midi.outputs.get($("#midi-port").val());
  if(queue.length > 0){
    processingQueue = true;
    if(queue[0] != "_"){
      output.send([0x90, symbolToMidi(queue[0]), 0x7f]);
    }
    setTimeout(function(){
      var note = queue.shift()
      if(note != "_"){
        output.send([0x80, symbolToMidi(note), 0x7f]);
      }
      processQueue();
    }, timeStep);
  }else {
    processingQueue = false;
  }
}

function getMelody(url){
  $.ajax({
    url: url,
    method: "GET"
  }).done(function(result){
    playMelody(result);
  });
}

function setControlChange(controlChange, value) {
  var output = midi.outputs.get($("#midi-port").val());
  output.send([0xB0, volcaControlChanges[controlChange], value]);
}

function postNote(note){
  var symbol = noteToSymbol[note]

  if(symbol != undefined){
    var multiplier = Math.random();
    if(multiplier > 0.9){
      symbol = symbol + " _ _ _ _";
    }else if(multiplier > 0.75){
      symbol = symbol + " _ _ _";
    }else if(multiplier > 0.7){
      symbol = symbol + " _ _";
    }else if(multiplier > 0.15){
      symbol = symbol + " _";
    }
    $.ajax({
      "url": api + song,
      "method": "POST",
      "data": {
        "sequence": symbol
      }
    }).done(function(){
      getMelody(api + song);
    })
  }
}

function symbolToMidi(symbol){
  if(symbol != undefined){
    var noteOctave = 4;
    if(symbol.charAt(symbol.length-1) == "-"){
      noteOctave--;
      symbol = symbol.substr(0, symbol.length-1);
    }else if(symbol.charAt(symbol.length-1) == "-"){
      noteOctave++;
      symbol = symbol.substr(0, symbol.length-1);
    }
    var note = symbolToNote[symbol];
    return noteToMidi(note, noteOctave);
  }
}