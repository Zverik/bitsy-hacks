/*
  ==================================
  EXTERNAL GAME DATA MOD (@mildmojo)
  ==================================

  Load your Bitsy game data from an external file or URL, separating it from your
  (modified) Bitsy HTML.

  Usage: IMPORT <file or URL>

  Examples: IMPORT frontier.bitsydata
            IMPORT http://my-cool-website.nz/frontier/frontier.bitsydata
            IMPORT /games/frontier/data/frontier.bitsydata

  HOW TO USE:
    1. Copy-paste this script into a new script tag after the Bitsy source code.
       Make sure this script comes *after* any other mods to guarantee that it
       executes first.
    2. Copy all your Bitsy game data out of the script tag at the top of your
       HTML into another file (I recommend `game-name.bitsydata`). In the HTML
       file, replace all game data with a single IMPORT statement that refers to
       your new data file.

  NOTE: Chrome can only fetch external files when they're served from a
        web server, so your game won't work if you just open your HTML file from
        disk. You could use Firefox, install a web server, or, if you have
        development tools like NodeJS, Ruby, Python, Perl, PHP, or others
        installed, here's a big list of how to use them to serve a folder as a
        local web server:
        https://gist.github.com/willurd/5720255

        If this mod finds an IMPORT statement anywhere in the Bitsy data
        contained in the HTML file, it will replace all game data with the
        IMPORTed data. It will not execute nested IMPORT statements in
        external files.

  Version: 1.1
  Bitsy Version: 4.5, 4.6
  License: WTFPL (do WTF you want)
*/

// Give a hoot, don't pollute; encapsulate in an IIFE for isolation.
(function(globals) {
  'use strict';

  var ERR_MISSING_IMPORT = 1;

  hook('startExportedGame', function beforeStart(superFn, superArgs) {
    var gameDataElem = document.scripts.namedItem('exportedGameData');

    tryImportGameData(gameDataElem.text, function withGameData(err, importedData) {
      if (err && err.error === ERR_MISSING_IMPORT) {
        console.warn(err.message);
      } else if (err) {
        console.warn('Make sure game data IMPORT statement refers to a valid file or URL.');
        throw err;
      }

      gameDataElem.text = "\n" + dos2unix(importedData);
      superFn.apply(null, superArgs);
    });
  });

  function tryImportGameData(gameData, done) {
    // Make sure this game data even uses the word "IMPORT".
    if (gameData.indexOf('IMPORT') === -1) {
      return done(null, {
        error: ERR_MISSING_IMPORT,
        message: 'No IMPORT found in Bitsy data. See instructions for external game data mod.'
      }, gameData);
    }

    var trim = function(line) { return line.trim(); };
    var isImport = function(line) { return getType(line) === 'IMPORT'; };
    var importCmd = gameData
      .split("\n")
      .map(trim)
      .find(isImport);

    // Make sure we found an actual IMPORT command.
    if (!importCmd) {
      return done({
        error: ERR_MISSING_IMPORT,
        message: 'No IMPORT found in Bitsy data. See instructions for external game data mod.'
      });
    }

    var src = (importCmd || '').split(/\s+/)[1];

    if (src) {
      return fetchData(src, done);
    } else {
      return done('IMPORT missing a URL or path to a Bitsy data file!');
    }
  }

  function fetchData(url, done) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);

    request.onload = function() {
      if (this.status >= 200 && this.status < 400) {
        // Success!
        return done(null, this.response);
      } else {
        return done('Failed to load game data: ' + request.statusText + ' (' + this.status + ')');
      }
    };

    request.onerror = function() {
      return done('Failed to load game data: ' + request.statusText);
    };

    request.send();
  }

  function hook(nameToHook, wrapperFn) {
    var superFn = globals[nameToHook].bind(globals);

    globals[nameToHook] = function() {
      var superArgs = [].slice.call(arguments);
      wrapperFn.apply(this, [superFn, superArgs]);
    };
  }

  function dos2unix(text) {
    return text.replace(/\r\n/g, "\n");
  }

})(window);
