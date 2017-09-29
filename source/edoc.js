"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const fsextra = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const handlebars = require("handlebars");
const glob = require("glob");
class EasyDoc {
    constructor(process) {
        this.process = process;
        this.templatesDirName = "scaffold";
        this.pagesDirName = 'pages';
        this.mainProcess = process;
    }
    setOptions(options) {
        this.options = options;
        //all user-specified paths must be normalized
        if (options.input) {
            options.input = path.normalize(options.input + '/');
        }
        if (options.output) {
            options.output = path.normalize(options.output + '/');
        }
        if (options.templates) {
            options.templates = path.normalize(options.templates + '/');
        }
        if (options.input) {
            //By default, look at the input dir for templates, if not present then fall back to default templates
            let templatesDir = path.join(options.input, this.templatesDirName);
            if (!fs.existsSync(templatesDir)) {
                console.log(chalk.green(`Custom templates dir '${templatesDir}' does not exist`));
                templatesDir = path.join(__dirname, this.templatesDirName);
                console.log(chalk.green(`Use default templates dir '${templatesDir}'`));
            }
            else {
                console.log(chalk.green(`Using custom templates dir '${templatesDir}'`));
            }
            options.templates = path.normalize(templatesDir);
            if (!options.parameters) {
                options.parameters = path.join(options.input, "parameters.json");
            }
            if (options.pages) {
                options.pages = path.normalize(options.pages + '/');
            }
            else {
                options.pages = path.join(options.input, this.pagesDirName);
            }
        }
    }
    scaffold() {
        let sourceTemplatesDir = path.join(__dirname, this.templatesDirName);
        let targetTemplatesDir = path.join(this.options.output);
        if (this.options.templates) {
            sourceTemplatesDir = this.options.templates;
        }
        console.log(chalk.green('Copying templates from "' + sourceTemplatesDir + '" to "' + targetTemplatesDir + '"  '));
        this.copyDirSync(sourceTemplatesDir, targetTemplatesDir);
        fsextra.copySync(__dirname, this.options.output, { overwrite: true, recursive: true, filter: new RegExp('.*\.json') });
    }
    copyDirSync(source, destination) {
        try {
            fsextra.copySync(source, destination);
        }
        catch (error) {
            console.log(chalk.red('Error copying directory: ' + source + ' to ' + destination));
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
        this.processTemplates(this.options.templates, this.options.output, this.tocPages);
    }
    processTemplates(templatePath, outputPath, tocPages) {
        glob(`${templatePath}/**/*.html`, { absolute: false, root: templatePath, cwd: templatePath, realpath: false }, (err, matches) => {
            matches.forEach(file => {
                file = path.normalize(file);
                let fullPath = path.join(templatePath, file.replace(templatePath, ''));
                let outPath = path.join(outputPath, file.replace(templatePath, ''));
                this.processTemplate(fullPath, outPath, tocPages);
            });
        });
    }
    processTemplate(fullPath, outPath, tocPages) {
        console.log(chalk.green(`Processing file '${fullPath}' as a handlebars template  ...`));
        let templateContent = fsextra.readFileSync(fullPath, 'utf8');
        let template = handlebars.compile(templateContent);
        let params = fsextra.readJsonSync(this.options.parameters);
        params.toc = tocPages;
        let result = template(params);
        fsextra.createFileSync(outPath);
        fsextra.writeFileSync(outPath, result);
        console.log(chalk.green(`Generated file '${outPath}'`));
    }
    getTocPages(pagesDir) {
        let pages = [];
        let files = fsextra.readdirSync(path.join(pagesDir));
        files.forEach(filename => {
            pages.push(this.getPage(filename));
        });
        return pages;
    }
    getPage(filename) {
        return {
            title: this.generateTitleFromFileName(filename),
            url: `${this.pagesDirName}/${filename}`
        };
    }
    generateTitleFromFileName(filename) {
        //First strip off any prefix numbers (000_)
        let re = new RegExp('([0-9]*_){0,1}(.*)');
        let result = re.exec(filename);
        let name = result[0];
        if (result.length == 2) {
            name = result[1];
        }
        if (result.length == 3) {
            name = result[2];
        }
        //Then split by camel case
        name = path.parse(name).name;
        return this.splitCamelCase(name);
    }
    splitCamelCase(value) {
        return value
            .replace(/([^A-Z])([A-Z])/g, '$1 $2')
            .replace(/^./, function (str) { return str.toUpperCase(); });
    }
    getVersion() {
        return "";
    }
}
exports.EasyDoc = EasyDoc;
class Page {
    get url() {
        return this._url;
    }
    set url(v) {
        this._url = v;
    }
    get title() {
        return this._title;
    }
    set title(v) {
        this._title = v;
    }
}
exports.Page = Page;
//# sourceMappingURL=edoc.js.map