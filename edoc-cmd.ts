#!/usr/bin/env node

import {EasyDoc} from './source/edoc';
import * as commander from 'commander';
import {EOL} from 'os';
import * as path from 'path';

let program = new commander.Command();
let easydoc = new EasyDoc(process);

function scaffold (command: commander.CommanderStatic) {
    easydoc.setOptions(command);
    easydoc.scaffold();
}

function run (command: commander.CommanderStatic) {
    easydoc.setOptions(command);
    easydoc.run();
}

let defaultTemplatesSourcePath = path.join(__dirname,'source','scaffold');
/*
    parse command-line arguments with node commander
        commander help: http://slides.com/timsanteford/conquering-commander-js
        command-line conventions: http://docopt.org
*/
 
program
    .version(easydoc.getVersion())
    .usage('[command] [--option]');

program.command('scaffold')
    .usage('[--option]')
    .description('create a template input directory')
    .option('-o, --output [path]', 'path to the output directory (default: ./)', './')
    .option('-v, --verbose', 'show verbose output including detailed errors')
    .option(`-t, --templates [path]`, `path to the template directory [default: ${defaultTemplatesSourcePath}]`, defaultTemplatesSourcePath)
    .action(function (command: commander.CommanderStatic) {
        scaffold(command);
    })

program.command('run')
    .usage('[--option]')
    .description('create a static website from an input directory')
    .option(`-t, --templates [path]`, `path to the template directory [default: ./]`, './')
    .option(`-p, --pages [path]`, `path to the pages directory [default: ./<input>/pages]`, '')
    .option('-i, --input [path]', 'path to the input directory [default: ./]', './')
    .option('-o, --output [path]', 'path to the output directory [default: ./output]', './output')
    .option('-v, --verbose', 'show verbose output including detailed errors')
    .option('-r, --redirect', 'create an index.html in the parent directory that redirects to the homepage')
    .option('-s, --set-version [version]', 'override parameters.version (useful for build tools) [default: false]', false)
    .option('-R, --set-release-date [date]', 'override parameters.date (useful for build tools) [default: false]', false)
    .action(function (command: commander.CommanderStatic) {
        run(command);
    });

program.parse(process.argv);

//if no arguments were provided, show help and then exit
if (!process.argv.slice(2).length) {
    program.help();
}
