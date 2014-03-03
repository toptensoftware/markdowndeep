var express = require('express');
var MarkdownDeep = require('MarkdownDeep');
var fs = require('fs');

// Here's where we create an instance of the MarkdownDeep engine
var mdd = new MarkdownDeep.Markdown();

// Set some options
mdd.ExtraMode = true;		// Enable the extra features of Markdown Extra
mdd.SafeMode = false;		// Enable safe mode to prevent XSS attacks from user-entered content


var app = express();
app.get('/', function(req, res){

	// Read index.md
	fs.readFile("index.md", 'utf8', function(err, data) {
	  if (err) 
	  	throw err;

	  // Here's where we translate the Markdown to HTML
	  data = mdd.Transform(data);

	  // Send it
	  res.setHeader('Content-Type', 'text/html');
	  res.setHeader('Content-Length', Buffer.byteLength(data));
	  res.end(data);
	});

});

app.listen(3000);
console.log('Listening on port 3000');