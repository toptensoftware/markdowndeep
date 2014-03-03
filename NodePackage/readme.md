# MarkdownDeep

## Open-source implementation of Markdown for C# and Javascript

This is the Node.JS package of MarkdownDeep - an open-source ([read license](license)) implementation of the increasingly popular web publishing syntax [Markdown][]. MarkdownDeep provides a high performance implementation of Markdown and MarkdownExtra in C# and JavaScript.

## At a Glance

* Supports all [Markdown][] syntax features.
* Optional support for all [PHP Markdown Extra][] features.
* Optional safe mode can sanitize HTML output (great for user entered content).
* Client Side Editor - toolbar, realtime preview, shortcut keys, help, etc... [Try It](http://www.toptensoftware.com/markdowndeep/dingus)
* Supports for the special requirements of content management, blog and comment systems.
* Over 400 unit test cases ensure correct results.

[Markdown]: http://daringfireball.net/projects/markdown/
[PHP Markdown Extra]: http://michelf.com/projects/php-markdown/

## Getting started with MarkdownDeep for Node.JS

First install MarkdownDeep, from command line

	> npm install markdowndeep

or via package.json eg:

	...
	  "dependencies": {
	    "markdowndeep": "*"
	  }
	...

Next, bring it into your project:

	var MarkdownDeep = require('markdowndeep');

Now, create an instance of the MarkdownDeep engine and set options:

	var mdd = new MarkdownDeep.Markdown();
	mdd.ExtraMode = true;
	mdd.SafeMode = true;

And finally, tranform your Markdown to HTML:

	var html = mdd.Transform("# Welcome to MarkdownDeep\nHello World\n\n");

For more details on the API, see <http://www.toptensoftware.com/markdowndeep>

Report faults and suggestions at <http://github.com/toptensoftware/markdowndeep>

Enjoy!

