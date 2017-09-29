import * as commander from 'commander';
import {EOL} from 'os';
import * as fs from 'fs';
import * as fsextra from 'fs-extra';
import * as path from 'path';
import * as chalk from 'chalk';
import * as handlebars from 'handlebars';



export class EasyDoc {    
    options: commander.CommanderStatic;
    mainProcess: NodeJS.Process;

    templatesDirName: string = "scaffold";
    constructor(private process: NodeJS.Process) {
        this.mainProcess = process;
    }

    setOptions(options: commander.CommanderStatic) {
        this.options = options;
        //all user-specified paths must be normalized
        if (options.input) {
            options.input = path.normalize(options.input+'/');
        }
        if (options.output) {
            options.output = path.normalize(options.output+'/');
        }
        if (options.templates) {
            options.templates = path.normalize(options.templates+'/');
        }
        if(options.input) {
            //By default, look at the input dir for templates, if not present then fall back to default templates
            var templatesDir = path.join(options.input, this.templatesDirName);
            if(!fs.existsSync(templatesDir)) {
                console.log(chalk.green(`Custom templates dir '${templatesDir}' does not exist`));
                templatesDir = path.join(__dirname, this.templatesDirName);
                console.log(chalk.green(`Use default templates dir '${templatesDir}'`));
            } else {
                console.log(chalk.green(`Using custom templates dir '${templatesDir}'`));
            }
            options.templates = templatesDir;

            if(! options.parameters ) {
                options.parameters = path.join(options.input, "parameters.json");
            }
           
            
        } 




    }

    scaffold() {
       let sourceTemplatesDir = path.join(__dirname, this.templatesDirName);
       let targetTemplatesDir = path.join(this.options.output);
        if(this.options.templates) {
            sourceTemplatesDir = this.options.templates;
        }
        console.log(chalk.green('Copying templates from "' + sourceTemplatesDir + '" to "' + targetTemplatesDir + '"  '));
        this.copyDirSync(sourceTemplatesDir, targetTemplatesDir);
        
        fsextra.copySync(__dirname, this.options.output, { overwrite: true, recursive: true, filter: new RegExp('.*\.json')});
    }

    copyDirSync(source, destination) {
        try {
            fsextra.copySync(source, destination);
        } catch (error) {
            console.log(chalk.red('Error copying directory: '+source+' to '+destination));
            if (this.options.verbose === true) {
                console.log(chalk.red(error));
                this.mainProcess.exit(1);
            }
        }
    }

    run() {
        let files = fsextra.readdirSync(this.options.templates);
        for (var fileIdx in files) {
            let file = files[0];
            let fullPath = path.join(this.options.templates, file);
            console.log(chalk.green(`Processing template '${fullPath}' ...`));
           
            let templateContent = fsextra.readFileSync(fullPath,'utf8' );
            
            var template = handlebars.compile(templateContent);
            let params = fsextra.readJsonSync(this.options.parameters);
            let result = template(params);

            let outPath = path.join(this.options.output, file);

            fsextra.createFileSync(outPath);
            fsextra.writeFileSync(outPath, result);
            console.log(chalk.green(`Generated file '${outPath}'`));            
        }
    }

    getVersion() : string{
        return "";
    }
}
