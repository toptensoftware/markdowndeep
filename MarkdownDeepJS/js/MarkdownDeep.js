/////////////////////////////////////////////////////////////////////////////
// MarkdownDeep.js

var MarkdownDeep = {};

/////////////////////////////////////////////////////////////////////////////
// MarkdownDeep.Markdown

MarkdownDeep.Markdown=function()
{
    // Creat a new span formatter, with back reference to self
    this.SpanFormatter=new SpanFormatter(this);
}

    MarkdownDeep.Markdown.prototype.HtmlEncode=function(dest, string, start, len)
    {
        // TODO:
        dest.Append(string.substr(start, len));
    }
    
    MarkdownDeep.Markdown.prototype.GetLinkDefinition=function(id)
    {
        return null;   
    }


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
    MarkdownDeep.CharTypes.is_lineend = function(ch)
    {
	    return (ch==' ' || ch=='\t');
    }
    MarkdownDeep.CharTypes.is_emphasis = function(ch)
    {
	    return (ch=='*' || ch=='_');
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


/*
 * These two functions IsEmailAddress and IsWebAddress
 * are intended as a quick and dirty way to tell if a 
 * <autolink> url is email, web address or neither.
 * 
 * They are not intended as validating checks.
 * 
 * (use of Regex for more correct test unnecessarily
 *  slowed down some test documents by up to 300%.)
 */

// Check if a string looks like an email address
MarkdownDeep.IsEmailAddress=function(str)
{
	var posAt = str.indexOf('@');
	if (posAt < 0)
		return false;

	var posLastDot = str.lastIndexOf('.');
	if (posLastDot < posAt)
		return false;

	return true;
}

// Check if a string looks like a url
MarkdownDeep.IsWebAddress=function(str)
{
    str=str.toLowerCase();
    if (str.substr(0, 7)=="http://")
        return true;
    if (str.substr(0, 8)=="https://")
        return true;
    if (str.substr(0, 6)=="ftp://")
        return true;
    if (str.substr(0, 7)=="file://")
        return true;
        
    return false;
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


/////////////////////////////////////////////////////////////////////////////
// MarkdownDeep.LinkInfo

MarkdownDeep.LinkInfo=function(def, link_text)
{
	this.def = def;
	this.link_text = link_text;
}


/////////////////////////////////////////////////////////////////////////////
// MarkdownDeep.Token

MarkdownDeep.TokenType = {}
MarkdownDeep.TokenType.Text=0;
MarkdownDeep.TokenType.HtmlTag=1;
MarkdownDeep.TokenType.Html=2;
MarkdownDeep.TokenType.open_em=3;
MarkdownDeep.TokenType.close_em=4;
MarkdownDeep.TokenType.open_strong=5;
MarkdownDeep.TokenType.close_strong=6;
MarkdownDeep.TokenType.code_span=7;
MarkdownDeep.TokenType.br=8;
MarkdownDeep.TokenType.link=9;
MarkdownDeep.TokenType.img=10;
MarkdownDeep.TokenType.opening_mark=11;
MarkdownDeep.TokenType.closing_mark=12;
MarkdownDeep.TokenType.internal_mark=13;

MarkdownDeep.Token=function(type, startOffset, length)
{
    this.type=type;
    this.startOffset=type;
    this.length=length;
    this.data=null;
}

/////////////////////////////////////////////////////////////////////////////
// MarkdownDeep.SpanFormatter

MarkdownDeep.SpanFormatter=function(markdown)
{
    this.m_Markdown=markdown;
    this.m_Parser=new MarkdownDeep.StringParser();
    this.m_SpareTokens=new Array();
    this.DisableLinks=false;
}

    // Format part of a string into a destination string builder
    MarkdownDeep.SpanFormatter.prototype.Format=function(dest, str, start, len)
    {
        // Reset the string parser
        this.m_Parser.Reset(str, start, len);

	    // Parse the string into a list of tokens
	    var tokens=this.Tokenize();
	    if (tokens == null)
	    {
		    // Nothing special, just html encode and write the entire string
		    this.m_Markdown.HtmlEncode(dest, str, start, len);
	    }
	    else
	    {
		    // Render all tokens
		    this.RenderTokens(dest, str, tokens);

		    // Return all tokens to the spare token pool
		    for (var t in tokens)
		    {
			    this.FreeToken(t);
		    }
	    }
    }

	// Format a string and return it as a new string
	// (used in formatting the text of links)
	MarkdownDeep.SpanFormatter.prototype.FormatDirect=function(str)
	{
		var dest = new MarkdownDeep.StringBuilder();
		this.Format(dest, str, 0, str.Length);
		return dest.ToString();
	}

	// Render a list of tokens to a destination string builder.
    MarkdownDeep.SpanFormatter.prototype.RenderTokens=function(sb, str, tokens)
    {
	    for (var t in tokens)
	    {
		    switch (t.type)
		    {
			    case MarkdownDeep.TokenType.Text:
				    // Append encoded text
				    this.m_Markdown.HtmlEncode(sb, str, t.startOffset, t.length);
				    break;

			    case MarkdownDeep.TokenType.HtmlTag:
				    // Append html as is
				    sb.SmartHtmlEncodeAmps(str, t.startOffset, t.length);
				    break;

			    case MarkdownDeep.TokenType.Html:
			    case MarkdownDeep.TokenType.opening_mark:
			    case MarkdownDeep.TokenType.closing_mark:
			    case MarkdownDeep.TokenType.internal_mark:
				    // Append html as is
				    sb.Append(str.substr(t.startOffset, t.length));
				    break;

			    case MarkdownDeep.TokenType.br:
				    sb.Append("<br />\n");
				    break;

			    case MarkdownDeep.TokenType.open_em:
				    sb.Append("<em>");
				    break;

			    case MarkdownDeep.TokenType.close_em:
				    sb.Append("</em>");
				    break;

			    case MarkdownDeep.TokenType.open_strong:
				    sb.Append("<strong>");
				    break;

			    case MarkdownDeep.TokenType.close_strong:
				    sb.Append("</strong>");
				    break;

			    case MarkdownDeep.TokenType.code_span:
				    sb.Append("<code>");
				    m_Markdown.HtmlEncode(sb, str, t.startOffset, t.length);
				    sb.Append("</code>");
				    break;

			    case MarkdownDeep.TokenType.link:
			    {
				    var li = t.data;
				    var sf = new MarkdownDeep.SpanFormatter(this.m_Markdown);
				    sf.DisableLinks = true;

				    li.def.RenderLink(this.m_Markdown, sb, sf.Format(li.link_text));
				    break;
			    }

			    case MarkdownDeep.TokenType.img:
			    {
				    var li = t.data;
				    li.def.RenderImg(this.m_Markdown, sb, li.link_text);
				    break;
			    }
		    }
		}
    }

    MarkdownDeep.SpanFormatter.prototype.Tokenize=function()
    {
        var p=this.m_Parser;
        
		var tokens = new Array();
		var emphasis_marks = null;

		// Scan string
		var start_text_token = p.position;
		while (!eof)
		{
			var end_text_token=p.position;

			// Work out token
			var token = null;
			switch (p.current())
			{
				case '*':
				case '_':

					// Create emphasis mark
					token = this.CreateEmphasisMark();

					// Store marks in a separate list the we'll resolve later
					switch (token.type)
					{
						case MarkdownDeep.TokenType.internal_mark:
						case MarkdownDeep.TokenType.opening_mark:
						case MarkdownDeep.TokenType.closing_mark:
							if (emphasis_marks==null)
							{
								emphasis_marks = new Array();
							}
							emphasis_marks.push(token);
							break;
					}
					break;

				case '`':
					token = this.ProcessCodeSpan();
					break;

				case '[':
				case '!':
				{
					// Process link reference
					var linkpos = p.position;
					token = this.ProcessLinkOrImage();

					// Rewind if invalid syntax
					// (the '[' or '!' will be treated as a regular character and processed below)
					if (token == null)
						p.position = linkpos;
					break;
				}

				case '<':
				{
					// Is it a valid html tag?
					var save = p.position;
					var tag = MarkdownDeep.HtmlTag.Parse(p);
					if (tag != null)
					{
						// Yes, create a token for it
						token = this.CreateToken(MarkdownDeep.TokenType.HtmlTag, save, p.position - save);
					}
					else
					{
						// No, rewind and check if it's a valid autolink eg: <google.com>
						p.position = save;
						token = this.ProcessAutoLink();

						if (token == null)
							p.position = save;
					}
					break;
				}

				case '&':
				{
					// Is it a valid html entity
					var save=p.position;
					if (p.SkipHtmlEntity())
					{
						// Yes, create a token for it
						token = this.CreateToken(MarkdownDeep.TokenType.Html, save, p.position - save);
					}

					break;
				}

				case ' ':
				{
					// Check for double space at end of a line
					if (p.CharAtOffset(1)==' ' && MarkdownDeep.CharTypes.is_lineend(p.CharAtOffset(2)))
					{
						// Yes, skip it
						p.SkipForward(2);

						// Don't put br's at the end of a paragraph
						if (!p.eof())
						{
							p.SkipEol();
							token = this.CreateToken(MarkdownDeep.TokenType.br, end_text_token, 0);
						}
					}
					break;
				}

				case '\\':
				{
					// Check followed by an escapable character
					if (MarkdownDeep.CharTypes.is_escpable(p.CharAtOffset(1)))
					{
						token = this.CreateToken(MarkdownDeep.TokenType.Text, p.position + 1, 1);
						p.SkipForward(2);
					}
					break;
				}
			}

			// If token found, append any preceeding text and the new token to the token list
			if (token!=null)
			{
				// Make sure the token list has been created
				if (tokens == null)
				{
					tokens = new Array();
				}

				// Create a token for everything up to the special character
				if (end_text_token > start_text_token)
				{
					tokens.push(this.CreateToken(MarkdownDeep.TokenType.Text, start_text_token, end_text_token-start_text_token));
				}

				// Add the new token
				tokens.push(token);

				// Remember where the next text token starts
				start_text_token=p.position;
			}
			else
			{
				// Skip a single character and keep looking
				p.SkipForward(1);
			}
		}

		// No tokens?
		if (tokens==null)
			return null;

		// Append a token for any trailing text after the last token.
		if (p.position > start_text_token)
		{
			tokens.push(p.CreateToken(MarkdownDeep.TokenType.Text, start_text_token, p.position-start_text_token));
		}

		// Do we need to resolve and emphasis marks?
		if (emphasis_marks != null)
		{
			this.ResolveEmphasisMarks(tokens, emphasis_marks);
		}

		// Done!
		return tokens;
	}

	/*
	 * Resolving emphasis tokens is a two part process
	 * 
	 * 1. Find all valid sequences of * and _ and create `mark` tokens for them
	 *		this is done by CreateEmphasisMarks during the initial character scan
	 *		done by Tokenize
	 *		
	 * 2. Looks at all these emphasis marks and tries to pair them up
	 *		to make the actual <em> and <strong> tokens
	 *		
	 * Any unresolved emphasis marks are rendered unaltered as * or _
	 */

	// Create emphasis mark for sequences of '*' and '_' (part 1)
	MarkdownDeep.SpanFormatter.prototype.CreateEmphasisMark=function()
	{
	    var p=this.m_Parser;
	    
		// Capture current state
		var ch = p.current();
		var altch = ch == '*' ? '_' : '*';
		var savepos = p.position;

		// Check for a consecutive sequence of just '_' and '*'
		if (p.bof() || MarkdownDeep.CharTypes.is_whitespace(p.CharAtOffset(-1)))
		{
			while (MarkdownDeep.CharTypes.is_emphasis(p.current()))
				p.SkipForward(1);

			if (p.eof() || MarkdownDeep.CharTypes.is_whitespace(p.current()))
			{
				return this.CreateToken(MarkdownDeep.TokenType.Html, savepos, p.position - savepos);
			}

			// Rewind
			p.position = savepos;
		}

		// Scan backwards and see if we have space before
		while (MarkdownDeep.CharTypes.is_emphasis(p.CharAtOffset(-1)))
			p.SkipForward(-1);
		var bSpaceBefore = p.bof() || MarkdownDeep.CharTypes.is_whitespace(p.CharAtOffset(-1));
		p.position = savepos;

		// Count how many matching emphasis characters
		while (p.current() == ch)
		{
			p.SkipForward(1);
		}
		var count=position-savepos;

		// Scan forwards and see if we have space after
		while (MarkdownDeep.CharTypes.is_emphasis(p.CharAtOffset(1)))
			p.SkipForward(1);
		var bSpaceAfter = p.eof() || MarkdownDeep.CharTypes.is_whitespace(p.CharAtOffset(1));
		p.position = savepos + count;

		if (bSpaceBefore)
		{
			return this.CreateToken(MarkdownDeep.TokenType.opening_mark, savepos, p.position - savepos);
		}

		if (bSpaceAfter)
		{
			return this.CreateToken(MarkdownDeep.TokenType.closing_mark, savepos, p.position - savepos);
		}

		return this.CreateToken(MarkdownDeep.TokenType.internal_mark, savepos, p.position - savepos);
	}

	// Split mark token
	MarkdownDeep.SpanFormatter.prototype.SplitMarkToken=function(tokens, marks, token, position)
	{
		// Create the new rhs token
		var tokenRhs = this.CreateToken(token.type, token.startOffset + position, token.length - position);

		// Adjust down the length of this token
		token.length = position;

		// Insert the new token into each of the parent collections
		marks.splice(marks.indexOf(token) + 1, 0, tokenRhs);
		tokens.splice(tokens.indexOf(token) + 1, 0, tokenRhs);

		// Return the new token
		return tokenRhs;
	}

	// Resolve emphasis marks (part 2)
	MarkdownDeep.SpanFormatter.prototype.ResolveEmphasisMarks=function(tokens, marks)
	{
	    var input=m_Parser.buf;
	
		var bContinue = true;
		while (bContinue)
		{
			bContinue = false;
			for (var i = 0; i < marks.length; i++)
			{
				// Get the next opening or internal mark
				var opening_mark = marks[i];
				if (opening_mark.type != MarkdownDeep.TokenType.opening_mark && opening_mark.type != MarkdownDeep.TokenType.internal_mark)
					continue;

				// Look for a matching closing mark
				for (var j = i + 1; j < marks.length; j++)
				{
					// Get the next closing or internal mark
					var closing_mark = marks[j];
					if (closing_mark.type != MarkdownDeep.TokenType.closing_mark && closing_mark.type != MarkdownDeep.TokenType.internal_mark)
						break;

					// Ignore if different type (ie: `*` vs `_`)
					if (input[opening_mark.startOffset] != input[closing_mark.startOffset])
						continue;

					// strong or em?
					var style = Math.min(opening_mark.length, closing_mark.length);

					// Triple or more on both ends?
					if (style >= 3)
					{
						style = (style % 2)==1 ? 1 : 2;
					}

					// Split the opening mark, keeping the RHS
					if (opening_mark.length > style)
					{
						opening_mark = this.SplitMarkToken(tokens, marks, opening_mark, opening_mark.length - style);
						i--;
					}

					// Split the closing mark, keeping the LHS
					if (closing_mark.length > style)
					{
						this.SplitMarkToken(tokens, marks, closing_mark, style);
					}

					// Connect them
					opening_mark.type = style == 1 ? MarkdownDeep.TokenType.open_em : MarkdownDeep.TokenType.open_strong;
					closing_mark.type = style == 1 ? MarkdownDeep.TokenType.close_em : MarkdownDeep.TokenType.close_strong;

					// Remove the matched marks
					marks.splice(opening_mark, 1);
					marks.splice(closing_mark, 1);
					bContinue = true;

					break;
				}
			}
		}
	}

	// Process auto links eg: <google.com>
    MarkdownDeep.SpanFormatter.prototype.ProcessAutoLink=function()
	{
		if (this.DisableLinks)
			return null;
			
	    var p=this.m_Parser;

		// Skip the angle bracket and remember the start
		p.SkipForward(1);
		p.Mark();

		// Allow anything up to the closing angle, watch for escapable characters
		while (!p.eof())
		{
			var ch = p.current();

			// No whitespace allowed
			if (MarkdownDeep.CharTypes.is_whitespace(ch))
				break;

			// End found?
			if (ch == '>')
			{
			    var url = MarkdownDeep.UnescapeString(p.Extract());

				var li = null;
				if (MarkdownDeep.IsEmailAddress(url))
				{
					var link_text;
					if (url.toLowerCase().substr(0, 7)=="mailto:")
					{
						link_text = url.substr(7);
					}
					else
					{
						link_text = url;
						url = "mailto:" + url;
					}

					li = new MarkdownDeep.LinkInfo(new MarkdownDeep.LinkDefinition("auto", url, null), link_text);
				}
				else if (MarkdownDeep.IsWebAddress(url))
				{
					li=new MarkdownDeep.LinkInfo(new MarkdownDeep.LinkDefinition("auto", url, null), url);
				}

				if (li!=null)
				{
					p.SkipForward(1);
					return this.CreateDataToken(MarkdownDeep.TokenType.link, li);
				}

				return null;
			}

			p.SkipEscapableChar();
		}

		// Didn't work
		return null;
	}

	// Process [link] and ![image] directives
    MarkdownDeep.SpanFormatter.prototype.ProcessLinkOrImage=function()
	{
		if (DisableLinks)
			return null;
			
		var p=this.m_Parser;

		// Link or image?
		var token_type = p.SkipChar('!') ? MarkdownDeep.TokenType.img : MarkdownDeep.TokenType.link;

		// Opening '['
		if (!p.SkipChar('['))
			return null;

		// Find the closing square bracket, allowing for nesting, watching for 
		// escapable characters
		p.Mark();
		var depth = 1;
		while (!p.eof())
		{
			var ch = p.current();
			if (ch == '[')
			{
				depth++;
			}
			else if (ch == ']')
			{
				depth--;
				if (depth == 0)
					break;
			}

			p.SkipEscapableChar();
		}

		// Quit if end
		if (p.eof())
			return null;

		// Get the link text and unescape it
		var link_text = MarkdownDeep.UnescapeString(p.Extract());

		// The closing ']'
		p.SkipForward(1);

		// Save position in case we need to rewind
		var savepos = p.position;

		// Inline links must follow immediately
		if (p.SkipChar('('))
		{
			// Extract the url and title
			var link_def = MarkdownDeep.LinkDefinition.ParseLinkTarget(p, null);
			if (link_def==null)
				return null;

			// Closing ')'
		    p.SkipWhitespace();
			if (!p.SkipChar(')'))
				return null;

			// Create the token
			return this.CreateDataToken(token_type, new LinkInfo(link_def, link_text));
		}

		// Optional space or tab
		if (!p.SkipChar(' '))
			p.SkipChar('\t');

		// If there's line end, we're allow it and as must line space as we want
		// before the link id.
		if (p.eol())
		{
			p.SkipEol();
			p.SkipLinespace();
		}

		// Reference link?
		var link_id = null;
		if (p.current() == '[')
		{
			// Skip the opening '['
			p.SkipForward(1);

			// Find the start/end of the id
			p.Mark();
			if (!p.Find(']'))
				return null;

			// Extract the id
			link_id = p.Extract();

			// Skip closing ']'
			p.SkipForward(1);
		}
		else
		{
			// Rewind to just after the closing ']'
			p.position = savepos;
		}

		// Link id not specified?
		if (!link_id)
		{
		    link_id=link_text;
		    
		    // Convert all whitespace+line end to a single space
		    while(true)
		    {
		        // Find carriage return
                var i=link_id.indexOf("\n");
                if (i<0)
                    break;
                    
                var start=i;
                while (start>0 && MarkdownDeep.CharTypes.is_whitespace(link_id[i-1]))
                    start--
                    
                var end=i;
                while (i<link_id.length && MarkdownDeep.CharTypes.is_whitespace(link_id[i]))
                    end++;
                    
                link_id=link_id.substr(0, start) + " " + link_id.substr(end);
			}
		}

		// Find the link definition, abort if not defined
		var def = this.m_Markdown.GetLinkDefinition(link_id);
		if (def == null)
			return null;

		// Create a token
		return this.CreateDataToken(token_type, new MarkdownDeep.LinkInfo(def, link_text));
	}

	// Process a ``` code span ```
    MarkdownDeep.SpanFormatter.prototype.ProcessCodeSpan=function()
	{
	    var p=this.m_Parser;
		var start = p.position;

		// Count leading ticks
		var tickcount = 0;
		while (p.SkipChar('`'))
		{
			tickcount++;
		}

		// Skip optional leading space...
		p.SkipWhitespace();

		// End?
		if (p.eof())
			return this.CreateToken(MarkdownDeep.TokenType.Text, start, p.position - start);

		var startofcode = p.position;

		// Find closing ticks
		if (!p.Find(Substring(start, tickcount)))
			return this.CreateToken(MarkdownDeep.TokenType.Text, start, p.position - start);

		// Save end position before backing up over trailing whitespace
		var endpos = p.position + tickcount;
		while (MarkdownDeep.CharTypes.is_whitespace(p.CharAtOffset(-1)))
			p.SkipForward(-1);

		// Create the token, move back to the end and we're done
		var ret = this.CreateToken(MarkdownDeep.TokenType.code_span, startofcode, p.position - startofcode);
		p.position = endpos;
		return ret;
	}

    MarkdownDeep.SpanFormatter.prototype.CreateToken=function(type, startOffset, length)
	{
		if (this.m_SpareTokens.length != 0)
		{
			var t = this.m_SpareTokens.Pop();
			t.type = type;
			t.startOffset = startOffset;
			t.length = length;
			t.data = null;
			return t;
		}
		else
			return new MarkdownDeep.Token(type, startOffset, length);
	}

	// CreateToken - create or re-use a token object
	MarkdownDeep.SpanFormatter.prototype.CreateDataToken=function(type, data)
	{
		if (this.m_SpareTokens.length != 0)
		{
			var t = this.m_SpareTokens.Pop();
			t.type = type;
			t.data = data;
			return t;
		}
		else
		{
			var t=new MarkdownDeep.Token(type, 0, 0);
			t.data=data;
			return t;
		}
	}

	// FreeToken - return a token to the spare token pool
	MarkdownDeep.SpanFormatter.prototype.FreeToken=function(token)
	{
		token.data = null;
		this.m_SpareTokens.push(token);
	}

