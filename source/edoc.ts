import * as commander from 'commander';
import {EOL} from 'os';
import * as fs from 'fs';
import * as fsextra from 'fs-extra';
import * as path from 'path';
import * as chalk from 'chalk';
import * as handlebars from 'handlebars';
import * as glob from 'glob';

export class EasyDoc {    
    options: commander.CommanderStatic;
    mainProcess: NodeJS.Process;
    tocPages: Page[];
    templatesDirName: string = "scaffold";
    pagesDirName: string = 'pages';
    constructor(private process: NodeJS.Process) {
        this.mainProcess = process;
    }

    setOptions(options: commander.CommanderStatic) {
        this.options = options;
        //all user-specified paths must be normalized
        if (options.input) {
            options.input = path.posix.normalize(options.input+'/');
        }
        if (options.output) {
            options.output = path.posix.normalize(options.output+'/');
        }
        if (options.templates) {
            options.templates = path.posix.normalize(options.templates+'/');
        } 




        if(options.input) {
            //By default, look at the input dir for templates, if not present then fall back to default templates
            let templatesDir = path.posix.normalize(options.input);
            if(!fs.existsSync(templatesDir)) {
                console.log(chalk.green(`Custom templates dir '${templatesDir}' does not exist`));
                templatesDir = path.posix.join(__dirname, this.templatesDirName);
                console.log(chalk.green(`Use default templates dir '${templatesDir}'`));
            } else {
                console.log(chalk.green(`Using custom templates dir '${templatesDir}'`));
            }
            options.templates = path.posix.normalize(templatesDir);

            if(! options.parameters ) {
                options.parameters = path.posix.join(options.input, "parameters.json");
            }
  
            if (options.pages) {
                options.pages = path.posix.normalize(options.pages+'/');
            } else {
                options.pages = path.posix.join(options.input, this.pagesDirName);
            }
        } 
    }

    scaffold() {
       let sourceTemplatesDir = path.posix.join(__dirname, this.templatesDirName);
       let targetTemplatesDir = path.posix.join(this.options.output);
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
        //Copy all content
        fsextra.copySync(this.options.templates, this.options.output, {recursive: true, overwrite: true});
        this.tocPages = this.getTocPages(this.options.pages);
        this.processTemplates(this.options.templates, this.options.output,  this.tocPages);
    }

    processTemplates(templatePath: string, outputPath: string, tocPages: Page[]) {

        let absoluteTemplatePath = this.normalizePath(path.posix.resolve(templatePath));
        glob(path.posix.join(absoluteTemplatePath,'**/*.html'),{absolute: false, root: absoluteTemplatePath,cwd: templatePath,realpath: false}, (err: Error, matches: string[]) => {
            matches.forEach(file => {
                file = this.normalizePath(file);
                let fullPath = this.normalizePath(path.posix.join(absoluteTemplatePath, file.replace(absoluteTemplatePath,'')));
                let outPath = this.normalizePath(path.posix.join(outputPath, file.replace(absoluteTemplatePath, ''))); 

                this.processTemplate(fullPath, outPath, tocPages);
            });
        })
    }

    normalizePath(filepath: string): string {
        return filepath.replace(/\\/g,"/",);
    }

    processTemplate(fullPath: string, outPath: string, tocPages: Page[]) {
        console.log(chalk.green(`Processing file '${fullPath}' as a handlebars template  ...`));
        let templateContent = fsextra.readFileSync(fullPath,'utf8' );
        
        let template = handlebars.compile(templateContent);
        let params = fsextra.readJsonSync(this.options.parameters);

        
        params.toc = tocPages;

        let result = template(params);

        fsextra.createFileSync(outPath);
        fsextra.writeFileSync(outPath, result);
        console.log(chalk.green(`Generated file '${outPath}'`)); 
    }

    getTocPages(pagesDir: string): Page[] {
        let pages: Page[] = [] ;
        let files = fsextra.readdirSync(path.posix.join(pagesDir));
        files.forEach(filename => {
            //Only look at top level files
            if(fsextra.statSync(path.posix.join(pagesDir,filename)).isFile()) {
                pages.push( this.getPage(filename))
            }
        });

        return pages;
    }

    getPage(filename: string): Page {
        return <Page>{
            title: this.generateTitleFromFileName(filename),
            url: `${this.pagesDirName}/${filename}`
        }
    }

    generateTitleFromFileName(filename: string): string {
        //First strip off any prefix numbers (000_)
        let re = new RegExp('([0-9]*_){0,1}(.*)');
        let result  = re.exec(filename);

        let name = result[0];
        if(result.length == 2) {
            name = result[1];
        }
        if(result.length == 3) {
            name = result[2];
        }
        //Then split by camel case
        name = path.posix.parse(name).name;
        return this.splitCamelCase(name);
    }

    splitCamelCase(value: string): string {
        return value
            .replace(/([^A-Z])([A-Z])/g, '$1 $2')
            .replace(/^./, function(str){ return str.toUpperCase(); })
    }

    getVersion() : string{
        return "";
    }
}

export class Page {
    private _url : string;
    public get url() : string {
        return this._url;
    }
    public set url(v : string) {
        this._url = v;
    }

    private _title : string;
    public get title() : string {
        return this._title;
    }
    public set title(v : string) {
        this._title = v;
    }
    
}
