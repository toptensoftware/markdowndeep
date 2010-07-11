/////////////////////////////////////////////////////////////////////////////
// MarkdownDeep.js

var MarkdownDeep = {};

/////////////////////////////////////////////////////////////////////////////
// MarkdownDeep.CharTypes

MarkdownDeep.CharTypes = {};

    MarkdownDeep.CharTypes.is_digit = function(ch)
    {
	    return ch>='0' && ch<='9';
    }
    MarkdownDeep.CharTypes.is_hex = function(ch)
    {
	    return (ch>='0' && ch<='9') || (ch>='a' && ch<='f') || (ch>='A' && ch<='F')
    }
    MarkdownDeep.CharTypes.is_alpha = function(ch)
    {
	    return (ch>='a' && ch<='z') || (ch>='A' && ch<='Z');
    }
    MarkdownDeep.CharTypes.is_alphadigit = function(ch)
    {
	    return (ch>='a' && ch<='z') || (ch>='A' && ch<='Z') || (ch>='0' && ch<='9');
    }
    MarkdownDeep.CharTypes.is_whitespace = function(ch)
    {
        return (ch==' ' || ch=='\t' || ch=='\r' || ch=='\t');
    }
    MarkdownDeep.CharTypes.is_linespace = function(ch)
    {
	    return (ch==' ' || ch=='\t');
    }
    MarkdownDeep.CharTypes.is_escapable = function(ch)
    {
	    switch (ch)
	    {
		    case '\\':
		    case '`':
		    case '*':
		    case '_':
		    case '{':
		    case '}':
		    case '[':
		    case ']':
		    case '(':
		    case ')':
		    case '#':
		    case '+':
		    case '-':
		    case '.':
		    case '!':
		    case '>':
			    return true;
	    }

	    return false;
    }


/////////////////////////////////////////////////////////////////////////////
// MarkdownDeep Utility functions

// Check if str[pos] looks like a html entity
// Returns -1 if not, or offset of character after it yes.
MarkdownDeep.SkipHtmlEntity = function(str, pos)
{
	if (str[pos]!='&')
		return -1;
		
	var save=pos;
	pos++;
	
	if (str[pos]=='#')
	{
		pos++;
		if (str[pos]=='x' || str[pos]=='X')
		{
			pos++;
			fn_test=MarkdownDeep.CharTypes.is_hex;
		}
		else
		{
			fn_test=MarkdownDeep.CharTypes.is_digit;
		}
	}
	else
	{
		fn_test=MarkdownDeep.CharTypes.is_alphadigit;
	}
	
	if (fn_test(str[pos]))
	{
		pos++;
		while (fn_test(str[pos]))
			pos++;
			
		if (str[pos]==';')
		{
			pos++;
			return pos;
		}
	}
	
	pos=save;
	return -1;
}

MarkdownDeep.UnescapeString = function (str)
{
    // Find first backslash
    var bspos=str.indexOf('\\');
    if (bspos<0)
        return str; 
    
    // Build new string with escapable backslashes removed
    var b=new MarkdownDeep.StringBuilder();
    var piece=0;    
    while (bspos>=0)
    {
        if (MarkdownDeep.CharTypes.is_escapable(str[bspos+1]))
        {
            if (bspos>piece)
                b.Append(str.substr(piece, bspos-piece));
            
            piece=bspos+1;
        }

        bspos=str.indexOf('\\', bspos+1);
    }
    
    if (piece<str.length)
        b.Append(str.substr(piece, str.length-piece));
        
	return b.ToString();
}

MarkdownDeep.Trim=function(str)
{
    var i=0;
    var l=str.length;
    
    while (i<l && MarkdownDeep.CharTypes.is_whitespace(str[i]))
        i++;
    while (l-1>i && MarkdownDeep.CharTypes.is_whitespace(str[i-1]))
        i--;
        
    return str.substr(i, l-i);
}
    
/////////////////////////////////////////////////////////////////////////////
// MarkdownDeep.StringBuilder

// Initializes a new instance of the MarkdownDeep.StringBuilder class
// and appends the given value if supplied
MarkdownDeep.StringBuilder = function()
{
	this.content = new Array("");
}

	MarkdownDeep.StringBuilder.prototype.Append = function(value)
	{
		if (value)
			this.content.push(value);
	}
	MarkdownDeep.StringBuilder.prototype.Clear = function()
	{
		this.content.length=0;
	}
	MarkdownDeep.StringBuilder.prototype.ToString = function()
	{
		return this.content.join("");
	}

    MarkdownDeep.StringBuilder.prototype.HtmlRandomize=function(url)
    {
	    // Randomize
	    var len=url.length;
	    for (var i=0; i<len; i++)
	    {
		    var x = Math.random();
		    if (x > 0.90 && url[i] != '@')
		    {
			    this.Append(url[i]);
		    }
		    else if (x > 0.45)
		    {
			    this.Append("&#");
			    this.Append(url.charCodeAt(i).toString());
			    this.Append(";");
		    }
		    else
		    {
			    this.Append("&#x");
			    this.Append(url.charCodeAt(i).toString(16));
			    this.Append(";");
		    }
	    }
    }

    MarkdownDeep.StringBuilder.prototype.SmartHtmlEncodeAmpsAndAngles=function(str)
    {
        var len=str.length;
        var piece=0;
	    for (var i=0; i<len; i++)
	    {
		    switch (str[i])
		    {
			    case '&':
			        var after=MarkdownDeep.SkipHtmlEntity(str, i);
			        if (after<0)
				    {
				        if (i>piece)
				        {
				            this.Append(str.substr(piece, i-piece));
				        }
					    this.Append("&amp;");
					    piece=i+1;
				    }
				    else
				    {
				        i=after-1;
				    }
				    break;

			    case '<':
			        if (i>piece)
			            this.Append(str.substr(piece, i-piece));
				    this.Append("&lt;");
				    piece=i+1;
				    break;

			    case '>':
			        if (i>piece)
			            this.Append(str.substr(piece, i-piece));
				    this.Append("&gt;");
				    piece=i+1;
				    break;

			    case '\"':
			        if (i>piece)
			            this.Append(str.substr(piece, i-piece));
				    this.Append("&quot;");
				    piece=i+1;
				    break;
		    }
	    }
    	
        if (i>piece)
            this.Append(str.substr(piece, i-piece));
    }

    MarkdownDeep.StringBuilder.prototype.SmartHtmlEncodeAmps=function(str)
    {
        var len=str.length;
        var piece=0;
	    for (var i=0; i<len; i++)
	    {
		    switch (str[i])
		    {
			    case '&':
			        var after=MarkdownDeep.SkipHtmlEntity(str, i);
			        if (after<0)
				    {
				        if (i>piece)
				        {
				            this.Append(str.substr(piece, i-piece));
				        }
					    this.Append("&amp;");
					    piece=i+1;
				    }
				    else
				    {
				        i=after-1;
				    }
				    break;
		    }
	    }
    	
        if (i>piece)
            this.Append(str.substr(piece, i-piece));
    }




/////////////////////////////////////////////////////////////////////////////
// StringParser

MarkdownDeep.StringParser=function()
{
    this.reset.apply(this, arguments);
}

	MarkdownDeep.StringParser.prototype.bof = function() 
	{ 
	    //RAH!
		return this.position==this.start; 
	}

	MarkdownDeep.StringParser.prototype.eof = function() 
	{ 
		return this.position==this.end; 
	}

	MarkdownDeep.StringParser.prototype.eol = function() 
	{ 
	    var ch=this.buf[this.position];
	    return ch=='\r' || ch=='\n' || ch==undefined;
	}

	MarkdownDeep.StringParser.prototype.reset=function(/*string, position, length*/)
	{
		this.buf=arguments.length>0 ? arguments[0] : null;
		this.start=arguments.length>1 ? arguments[1] : 0;
		this.end=arguments.length>2 ? this.start + arguments[2] : (this.buf==null ? 0 : this.buf.length);
		this.position=this.start;
	}

	MarkdownDeep.StringParser.prototype.current = function()
	{
		return this.buf[this.position];
	}

	MarkdownDeep.StringParser.prototype.remainder = function()
	{
		return this.buf.substr(this.position);
	}

	MarkdownDeep.StringParser.prototype.SkipToEof = function()
	{
		this.position=this.end;
	}

	MarkdownDeep.StringParser.prototype.SkipForward = function(count)
	{
		this.position+=count;
	}

	MarkdownDeep.StringParser.prototype.SkipToEol = function()
	{
		this.position = this.buf.indexOf('\n', this.position);
		if (this.position<0)
			this.position=this.end;
	}

	MarkdownDeep.StringParser.prototype.SkipEol = function()
	{
		var save=this.position;
		if (this.buf[this.position]=='\r')
			this.position++;
		if (this.buf[this.position]=='\n')
			this.position++;
		return this.position!=save;
	}

	MarkdownDeep.StringParser.prototype.SkipToNextLine = function()
	{
		this.SkipToEol();
		this.SkipEol();
	}

	MarkdownDeep.StringParser.prototype.CharAtOffset = function(offset)
	{
		return this.buf[this.position+offset];
	}

	MarkdownDeep.StringParser.prototype.SkipChar = function(ch)
	{
		if (this.buf[this.position]==ch)
		{
			this.position++;
			return true;
		}
		return false;
	}
	MarkdownDeep.StringParser.prototype.SkipString= function(s)
	{
		if (this.buf.substr(this.position, s.length)==s)
		{
			this.position+=s.length;
			return true;
		}
		return false;
	}
	MarkdownDeep.StringParser.prototype.SkipWhitespace= function()
	{
		var save=this.position;
		while (true)
		{
			var ch=this.buf[this.position];
			if (ch!=' ' && ch!='\t' && ch!='\r' && ch!='\n')
				break;
			this.position++;				
		}
		return this.position!=save;
	}
	MarkdownDeep.StringParser.prototype.SkipLinespace= function()
	{
		var save=this.position;
		while (true)
		{
			var ch=this.buf[this.position];
			if (ch!=' ' && ch!='\t')
				break;
			this.position++;				
		}
		return this.position!=save;
	}
	MarkdownDeep.StringParser.prototype.Find= function(s)
	{
		this.position=this.buf.indexOf(s, this.position);
		if (this.position<0)
		{
			this.position=this.end;
			return false;
		}
		return true;
	}
	MarkdownDeep.StringParser.prototype.Mark= function()
	{
		this.mark=this.position;
	}
	MarkdownDeep.StringParser.prototype.Extract = function()
	{
		if (this.mark>=this.position)
			return "";
		else
			return this.buf.substr(this.mark, this.position-this.mark);
	}
	MarkdownDeep.StringParser.prototype.SkipIdentifier = function()
	{
		var ch=this.buf[this.position];
		if ((ch>='a' && ch<='z') || (ch>='A' && ch<='Z') || ch=='_')
		{
			this.position++;
			while (true)
			{
				var ch=this.buf[this.position];
				if ((ch>='a' && ch<='z') || (ch>='A' && ch<='Z') || ch=='_' || (ch>='0' && ch<='9'))
					this.position++;
				else
					return true;
			}
		}
		return false;
	}
	MarkdownDeep.StringParser.prototype.SkipHtmlEntity = function()
	{
	    if (this.buf[this.position]!='&')
	        return false;

	    var newpos=MarkdownDeep.SkipHtmlEntity(this.buf, this.position);
	    if (newpos<0)
	        return false;
	        
        this.position=newpos;
        return true;
	}

    MarkdownDeep.StringParser.prototype.SkipEscapableChar = function()
    {
		if (this.buf[this.position] == '\\' && MarkdownDeep.CharTypes.is_escapable(this.buf[this.position+1]))
		{
		    this.position+=2;
		    return true;
		}
		else
		{
		    if (this.position<this.end)
		        this.position++;
		    return false;
		}
	}


/////////////////////////////////////////////////////////////////////////////
// MarkdownDeep.HtmlTag

MarkdownDeep.HtmlTag=function(name)
{
    this.name=name;
    this.attributes={};
}

    MarkdownDeep.HtmlTag.IsSafeUrl = function(url)
    {
        url=url.toLowerCase();
        return (url.substr(0, 7)=="http://" ||
                url.substr(0, 8)=="https://" ||
                url.substr(0, 6)=="ftp://")
    }

    MarkdownDeep.HtmlTag.allowed_tags = {
	    "b":1,"blockquote":1,"code":1,"dd":1,"dt":1,"dl":1,"del":1,"em":1,
	    "h1":1,"h2":1,"h3":1,"h4":1,"h5":1,"h6":1,"i":1,"kbd":1,"li":1,"ol":1,"ul":1,
	    "p":1, "pre":1, "s":1, "sub":1, "sup":1, "strong":1, "strike":1, "img":1, "a":1
    };

    MarkdownDeep.HtmlTag.allowed_attributes = {
        "a": { "href":1, "title":1 },
        "img": { "src":1, "width":1, "height":1, "alt":1, "title":1 }
    };
    		
    MarkdownDeep.HtmlTag.block_tags = { 
        "p":1, "div":1, "h1":1, "h2":1, "h3":1, "h4":1, "h5":1, "h6":1, 
	    "blockquote":1, "pre":1, "table":1, "dl":1, "ol":1, "ul":1, "script":1, "noscript":1, 
	    "form":1, "fieldset":1, "iframe":1, "math":1, "ins":1, "del":1 
    };


    MarkdownDeep.HtmlTag.prototype.attributes=null;
    MarkdownDeep.HtmlTag.prototype.closed=false;
    MarkdownDeep.HtmlTag.prototype.closing=false;
    
    MarkdownDeep.HtmlTag.prototype.attributeCount= function()
    {
        if (!this.attributes)
            return 0;
            
        var count=0;
        for (var x in this.attributes)
            count++;
            
        return count;
    }

    MarkdownDeep.HtmlTag.prototype.IsBlockTag = function()
    {
        return MarkdownDeep.HtmlTag.block_tags[this.name]==1;
    }

    MarkdownDeep.HtmlTag.prototype.IsSafe = function()
    {
	    var name_lower=this.name.toLowerCase();
    	
	    // Check if tag is in whitelist
	    if (!MarkdownDeep.HtmlTag.allowed_tags[name_lower])
	        return false;

	    // Find allowed attributes
	    var allowed_attributes=MarkdownDeep.HtmlTag.allowed_attributes[name_lower];
	    if (!allowed_attributes)
	    {
	        return this.attributeCount()==0;
	    }
    	    
	    // No attributes?
	    if (!this.attributes)
	        return true;

	    // Check all are allowed
	    for (var i in this.attributes)
	    {
	        if (!allowed_attributes[i.toLowerCase()])
			    return false;
	    }

	    // Check href attribute is ok
	    if (this.attributes["href"])
	    {
	        if (!MarkdownDeep.HtmlTag.IsSafeUrl(this.attributes["href"]))
	            return false;
	    }

	    if (this.attributes["src"])
	    {
	        if (!MarkdownDeep.HtmlTag.IsSafeUrl(this.attributes["src"]))
	            return false;
	    }

	    // Passed all white list checks, allow it
	    return true;
    }

    MarkdownDeep.HtmlTag.Parse=function(p)
    {
	    // Save position
	    var savepos = p.position;

	    // Parse it
	    var ret = this.ParseHelper(p);
	    if (ret!=null)
		    return ret;

	    // Rewind if failed
	    p.position = savepos;
	    return null;
    }

    MarkdownDeep.HtmlTag.ParseHelper=function(p)
    {
	    // Does it look like a tag?
	    if (p.current() != '<')
		    return null;

	    // Skip '<'
	    p.SkipForward(1);

	    // Is it a comment?
	    if (p.SkipString("!--"))
	    {
		    p.Mark();

		    if (p.Find("-->"))
		    {
			    var t = new MarkdownDeep.HtmlTag("!");
			    t.attributes["content"]=p.Extract();
			    t.closed=true;
			    p.SkipForward(3);
			    return t;
		    }
	    }

	    // Is it a closing tag eg: </div>
	    var bClosing = p.SkipChar('/');

	    // Get the tag name
	    p.Mark();
	    if (!p.SkipIdentifier())
		    return null;

	    // Probably a tag, create the MarkdownDeep.HtmlTag object now
	    var tag = new MarkdownDeep.HtmlTag(p.Extract());
	    tag.closing = bClosing;

	    // If it's a closing tag, no attributes
	    if (bClosing)
	    {
		    if (p.current() != '>')
			    return null;

		    p.SkipForward(1);
		    return tag;
	    }


	    while (!p.eof())
	    {
		    // Skip whitespace
		    p.SkipWhitespace();

		    // Check for closed tag eg: <hr />
		    if (p.SkipString("/>"))
		    {
			    tag.closed=true;
			    return tag;
		    }

		    // End of tag?
		    if (p.SkipChar('>'))
		    {
			    return tag;
		    }

		    // attribute name
            p.Mark();
		    if (!p.SkipIdentifier())
			    return null;
		    var attributeName=p.Extract();

		    // Skip whitespace
		    p.SkipWhitespace();

		    // Skip equal sign
		    if (!p.SkipChar('='))
			    return null;

		    // Skip whitespace
		    p.SkipWhitespace();

		    // Optional quotes
		    if (p.SkipChar('\"'))
		    {
			    // Scan the value
			    p.Mark();
			    if (!p.Find('\"'))
				    return null;

			    // Store the value
			    tag.attributes[attributeName]=p.Extract();

			    // Skip closing quote
			    p.SkipForward(1);
		    }
		    else
		    {
			    // Scan the value
			    p.Mark();
			    while (!p.eof() && !MarkdownDeep.CharTypes.is_whitespace(p.current()) && p.current() != '>' && p.current() != '/')
				    p.SkipForward(1);

			    if (!p.eof())
			    {
				    // Store the value
				    tag.attributes[attributeName]=p.Extract();
			    }
		    }
	    }

	    return null;
    }



/////////////////////////////////////////////////////////////////////////////
// MarkdownDeep.LinkDefinition

MarkdownDeep.LinkDefinition=function(id, url, title)
{
    this.id=id;
    this.url=url;
    if (title==undefined)
        this.title=null;
    else
        this.title=title;
}

    MarkdownDeep.LinkDefinition.prototype.RenderLink=function(m, b, link_text)
    {
	    if (this.url.substr(0, 7).toLowerCase()=="mailto:")
	    {
		    b.Append("<a href=\"");
		    b.HtmlRandomize(this.url);
		    b.Append('\"');
		    if (this.title)
		    {
			    b.Append(" title=\"");
			    b.SmartHtmlEncodeAmpsAndAngles(this.title);
			    b.Append('\"');
		    }
		    b.Append('>');
		    b.HtmlRandomize(link_text);
		    b.Append("</a>");
	    }
	    else
	    {
		    b.Append("<a href=\"");
		    b.SmartHtmlEncodeAmpsAndAngles(this.url);
		    b.Append('\"');
		    if (this.title)
		    {
			    b.Append(" title=\"");
			    b.SmartHtmlEncodeAmpsAndAngles(this.title);
			    b.Append('\"');
		    }
		    b.Append('>');
		    b.Append(link_text);	  // Link text already escaped by SpanFormatter
		    b.Append("</a>");
	    }
    }

    MarkdownDeep.LinkDefinition.prototype.RenderImg=function(m, b, alt_text)
    {
	    b.Append("<img src=\"");
	    b.SmartHtmlEncodeAmpsAndAngles(this.url);
	    b.Append('\"');
	    if (alt_text)
	    {
		    b.Append(" alt=\"");
		    b.SmartHtmlEncodeAmpsAndAngles(alt_text);
		    b.Append('\"');
	    }
	    if (this.title)
	    {
		    b.Append(" title=\"");
		    b.SmartHtmlEncodeAmpsAndAngles(this.title);
		    b.Append('\"');
	    }
	    b.Append(" />");
    }

    MarkdownDeep.LinkDefinition.ParseLinkDefinition=function(p)
    {
	    var savepos=p.position;
	    var l = MarkdownDeep.LinkDefinition.ParseLinkDefinitionInternal(p);
	    if (l==null)
		    p.position = savepos;
	    return l;
    }

    MarkdownDeep.LinkDefinition.ParseLinkDefinitionInternal=function(p)
    {
	    // Skip leading white space
	    p.SkipWhitespace();

	    // Must start with an opening square bracket
	    if (!p.SkipChar('['))
		    return null;

	    // Extract the id
	    p.Mark();
	    if (!p.Find(']'))
		    return null;
	    var id = p.Extract();
	    if (id.length == 0)
		    return null;
	    if (!p.SkipString("]:"))
		    return null;

	    // Parse the url and title
	    var link=this.ParseLinkTarget(p, id);

	    // and trailing whitespace
	    p.SkipLinespace();

	    // Trailing crap, not a valid link reference...
	    if (!p.eol())
		    return null;

	    return link;
    }

    // Parse just the link target
    // For reference link definition, this is the bit after "[id]: thisbit"
    // For inline link, this is the bit in the parens: [link text](thisbit)
    MarkdownDeep.LinkDefinition.ParseLinkTarget=function(p, id)
    {
	    // Skip whitespace
	    p.SkipWhitespace();

	    // End of string?
	    if (p.eol())
		    return null;

	    // Create the link definition
	    var r = new MarkdownDeep.LinkDefinition(id);

	    // Is the url enclosed in angle brackets
	    if (p.SkipChar('<'))
	    {
		    // Extract the url
		    p.Mark();

		    // Find end of the url
		    while (p.current() != '>')
		    {
			    if (p.eof())
				    return null;
			    p.SkipEscapableChar();
		    }

		    var url = p.Extract();
		    if (!p.SkipChar('>'))
			    return null;

		    // Unescape it
		    r.url = MarkdownDeep.UnescapeString(MarkdownDeep.Trim(url));

		    // Skip whitespace
		    p.SkipWhitespace();
	    }
	    else
	    {
		    // Find end of the url
		    p.Mark();
		    var paren_depth = 1;
		    while (!p.eol())
		    {
			    var ch=p.current();
			    if (MarkdownDeep.CharTypes.is_whitespace(ch))
				    break;
			    if (id == null)
			    {
				    if (ch == '(')
					    paren_depth++;
				    else if (ch == ')')
				    {
					    paren_depth--;
					    if (paren_depth==0)
						    break;
				    }
			    }

			    p.SkipEscapableChar();
		    }

		    r.url = MarkdownDeep.UnescapeString(MarkdownDeep.Trim(p.Extract()));
	    }

	    p.SkipLinespace();

	    // End of inline target
	    if (p.current()==')')
		    return r;

	    var bOnNewLine = p.eol();
	    var posLineEnd = p.position;
	    if (p.eol())
	    {
		    p.SkipEol();
		    p.SkipLinespace();
	    }

	    // Work out what the title is delimited with
	    var delim;
	    switch (p.current())
	    {
		    case '\'':  
		    case '\"':
			    delim = p.current();
			    break;

		    case '(':
			    delim = ')';
			    break;

		    default:
			    if (bOnNewLine)
			    {
				    p.position = posLineEnd;
				    return r;
			    }
			    else
				    return null;
	    }

	    // Skip the opening title delimiter
	    p.SkipForward(1);

	    // Find the end of the title
	    p.Mark();
	    while (true)
	    {
		    if (p.eol())
			    return null;

		    if (p.current() == delim)
		    {

			    if (delim != ')')
			    {
				    var savepos = p.position;

				    // Check for embedded quotes in title

				    // Skip the quote and any trailing whitespace
				    p.SkipForward(1);
				    p.SkipLinespace();

				    // Next we expect either the end of the line for a link definition
				    // or the close bracket for an inline link
				    if ((id == null && p.current() != ')') ||
					    (id != null && !p.eol()))
				    {
					    continue;
				    }

				    p.position = savepos;
			    }

			    // End of title
			    break;
		    }

		    p.SkipEscapableChar();
	    }

	    // Store the title
	    r.title = MarkdownDeep.UnescapeString(p.Extract());

	    // Skip closing quote
	    p.SkipForward(1);

	    // Done!
	    return r;
    }
