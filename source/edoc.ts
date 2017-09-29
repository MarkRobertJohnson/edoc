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
            let templatesDir = path.join(options.input, this.templatesDirName);
            if(!fs.existsSync(templatesDir)) {
                console.log(chalk.green(`Custom templates dir '${templatesDir}' does not exist`));
                templatesDir = path.join(__dirname, this.templatesDirName);
                console.log(chalk.green(`Use default templates dir '${templatesDir}'`));
            } else {
                console.log(chalk.green(`Using custom templates dir '${templatesDir}'`));
            }
            options.templates = path.normalize(templatesDir);

            if(! options.parameters ) {
                options.parameters = path.join(options.input, "parameters.json");
            }
  
            if (options.pages) {
                options.pages = path.normalize(options.pages+'/');
            } else {
                options.pages = path.join(options.input, this.pagesDirName);
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
        //Copy all content
        fsextra.copySync(this.options.templates, this.options.output);
        this.tocPages = this.getTocPages(this.options.pages);
        this.processTemplates(this.options.templates, this.options.output,  this.tocPages);
    }

    processTemplates(templatePath: string, outputPath: string, tocPages: Page[]) {

        glob(`${templatePath}/**/*.html`,{absolute: false, root: templatePath,cwd: templatePath,realpath: false}, (err: Error, matches: string[]) => {
            matches.forEach(file => {
                file = path.normalize(file);
                let fullPath = path.join(templatePath, file.replace(templatePath,''));
                let outPath = path.join(outputPath, file.replace(templatePath, '')); 

                this.processTemplate(fullPath, outPath, tocPages);
            });
        })
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
        let files = fsextra.readdirSync(path.join(pagesDir));
        files.forEach(filename => {
            pages.push( this.getPage(filename))
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
        name = path.parse(name).name;
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
