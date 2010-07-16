/////////////////////////////////////////////////////////////////////////////
// js

if (Array.prototype.indexOf==undefined)
{
    Array.prototype.indexOf=function(obj) 
    {
        for (var i=0; i<this.length; i++)
        {
            if (this[i]===obj)
                return i;
        }
        
        return -1;
    }
}



/////////////////////////////////////////////////////////////////////////////
// Markdown

var MarkdownDeep = new function(){


    function Markdown()
    {
        this.m_SpanFormatter=new SpanFormatter(this);
        this.m_SpareBlocks=new Array();
        this.m_StringBuilder=new StringBuilder();
        this.m_LinkDefinitions=new Array();
    }
    
    var p=Markdown.prototype;
    p.Transform=function(input)
    {
        // Normalize line ends
        var rpos=input.indexOf("\r");
        if (rpos>=0)
        {
            var npos=input.indexOf("\n");
            if (npos>=0)
            {
                if (npos<rpos)
                {
                    input=input.replace(/\n\r/g, "\n");
                }
                else
                {
                    input=input.replace(/\r\n/g, "\n");
                }
            }

            input=input.replace(/\r/g, "\n")
        }
        
    
		// Reset the list of link definitions
		this.m_LinkDefinitions.length=0;

		// Process blocks
		var blocks = new BlockProcessor(this).Process(input);

		// Render
		var sb = this.GetStringBuilder();
		for (var i = 0; i < blocks.length; i++)
		{
		    var b=blocks[i];
		    b.Render(this, sb);
	    }
		

		// Done
		return sb.ToString();
    }

	// Add a link definition
	p.AddLinkDefinition=function(link)
	{
	    this.m_LinkDefinitions[link.id]=link;
	}

	// Get a link definition
    p.GetLinkDefinition=function(id)
	{
	    var x=this.m_LinkDefinitions[id];
	    if (x==undefined)
	        return null;    
	    else
    	    return x;
    }
	
	p.GetStringBuilder=function()
	{
	    this.m_StringBuilder.Clear();
	    return this.m_StringBuilder;
	}


    p.processSpan=function(sb, str, start, len)
    {
        return this.m_SpanFormatter.Format(sb, str, start, len);
    }

    /////////////////////////////////////////////////////////////////////////////
    // CharTypes
    
    var CharTypes={};

    CharTypes.is_digit = function(ch)
    {
	    return ch>='0' && ch<='9';
    }
    CharTypes.is_hex = function(ch)
    {
	    return (ch>='0' && ch<='9') || (ch>='a' && ch<='f') || (ch>='A' && ch<='F')
    }
    CharTypes.is_alpha = function(ch)
    {
	    return (ch>='a' && ch<='z') || (ch>='A' && ch<='Z');
    }
    CharTypes.is_alphadigit = function(ch)
    {
	    return (ch>='a' && ch<='z') || (ch>='A' && ch<='Z') || (ch>='0' && ch<='9');
    }
    CharTypes.is_whitespace = function(ch)
    {
        return (ch==' ' || ch=='\t' || ch=='\r' || ch=='\n');
    }
    CharTypes.is_linespace = function(ch)
    {
	    return (ch==' ' || ch=='\t');
    }
    CharTypes.is_lineend = function(ch)
    {
	    return (ch=='\r' || ch=='\n');
    }
    CharTypes.is_emphasis = function(ch)
    {
	    return (ch=='*' || ch=='_');
    }
    CharTypes.is_escapable = function(ch)
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


// Utility functions

    // Check if str[pos] looks like a html entity
    // Returns -1 if not, or offset of character after it yes.
    function SkipHtmlEntity(str, pos)
    {
	    if (str.charAt(pos)!='&')
		    return -1;
    		
	    var save=pos;
	    pos++;
    	
	    if (str.charAt(pos)=='#')
	    {
		    pos++;
		    if (str.charAt(pos)=='x' || str.charAt(pos)=='X')
		    {
			    pos++;
			    fn_test=CharTypes.is_hex;
		    }
		    else
		    {
			    fn_test=CharTypes.is_digit;
		    }
	    }
	    else
	    {
		    fn_test=CharTypes.is_alphadigit;
	    }
    	
	    if (fn_test(str.charAt(pos)))
	    {
		    pos++;
		    while (fn_test(str.charAt(pos)))
			    pos++;
    			
		    if (str.charAt(pos)==';')
		    {
			    pos++;
			    return pos;
		    }
	    }
    	
	    pos=save;
	    return -1;
    }

    function UnescapeString(str)
    {
        // Find first backslash
        var bspos=str.indexOf('\\');
        if (bspos<0)
            return str; 
        
        // Build new string with escapable backslashes removed
        var b=new StringBuilder();
        var piece=0;    
        while (bspos>=0)
        {
            if (CharTypes.is_escapable(str.charAt(bspos+1)))
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

    function Trim(str)
    {
        var i=0;
        var l=str.length;
        
        while (i<l && CharTypes.is_whitespace(str.charAt(i)))
            i++;
        while (l-1>i && CharTypes.is_whitespace(str.charAt(i-1)))
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
    function IsEmailAddress(str)
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
    function IsWebAddress(str)
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
    // StringBuilder

    function StringBuilder()
    {
	    this.content = new Array();
    }

    p=StringBuilder.prototype;
	p.Append = function(value)
	{
		if (value)
			this.content.push(value);
	}
	p.Clear = function()
	{
		this.content.length=0;
	}
	p.ToString = function()
	{
		return this.content.join("");
	}

    p.HtmlRandomize=function(url)
    {
	    // Randomize
	    var len=url.length;
	    for (var i=0; i<len; i++)
	    {
		    var x = Math.random();
		    if (x > 0.90 && url.charAt(i) != '@')
		    {
			    this.Append(url.charAt(i));
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

    p.HtmlEncode = function(str, startOffset, length) {
        var end = startOffset + length;
        var piece = startOffset;
        for (var i = startOffset; i < end; i++) 
        {
            switch (str.charAt(i)) 
            {
                case '&':
                    if (i > piece)
                        this.Append(str.substr(piece, i - piece));
                    this.Append("&amp;");
                    piece = i + 1;
                    break;

                case '<':
                    if (i > piece)
                        this.Append(str.substr(piece, i - piece));
                    this.Append("&lt;");
                    piece = i + 1;
                    break;

                case '>':
                    if (i > piece)
                        this.Append(str.substr(piece, i - piece));
                    this.Append("&gt;");
                    piece = i + 1;
                    break;

                case '\"':
                    if (i > piece)
                        this.Append(str.substr(piece, i - piece));
                    this.Append("&quot;");
                    piece = i + 1;
                    break;
            }
        }

        if (i > piece)
            this.Append(str.substr(piece, i - piece));
    }

    p.SmartHtmlEncodeAmpsAndAngles = function(str, startOffset, length)
    {
        var end=startOffset+length;
        var piece=startOffset;
	    for (var i=startOffset; i<end; i++)
	    {
		    switch (str.charAt(i))
		    {
			    case '&':
			        var after=SkipHtmlEntity(str, i);
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

    p.SmartHtmlEncodeAmps=function(str, startOffset, length)
    {
        var end=startOffset + length;
        var piece=startOffset;
	    for (var i=startOffset; i<end; i++)
	    {
		    switch (str.charAt(i))
		    {
			    case '&':
			        var after=SkipHtmlEntity(str, i);
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


    p.HtmlEncodeAndConvertTabsToSpaces=function(str, startOffset, length)
	{
        var end=startOffset+length;
        var piece=startOffset;
		var pos = 0;
	    for (var i=startOffset; i<end; i++)
	    {
		    switch (str.charAt(i))
		    {
		        case '\t':

			        if (i>piece)
			        {
			            this.Append(str.substr(piece, i-piece));
			        }
				    piece=i+1;

					this.Append(' ');
					pos++;
					while ((pos % 4) != 0)
					{
						this.Append(' ');
						pos++;
					}
					pos--;		// Compensate for the pos++ below
					break;
		            
		    
			    case '&':
			        if (i>piece)
			            this.Append(str.substr(piece, i-piece));
				    this.Append("&amp;");
				    piece=i+1;
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
		    
		    pos++;
	    }
    	
        if (i>piece)
            this.Append(str.substr(piece, i-piece));
	}




    /////////////////////////////////////////////////////////////////////////////
    // StringParser

    function StringParser()
    {
        this.reset.apply(this, arguments);
    }

    p=StringParser.prototype;
	p.bof = function() 
	{ 
		return this.position==this.start; 
	}

	p.eof = function() 
	{ 
		return this.position>=this.end; 
	}

	p.eol = function() 
	{ 
	    var ch=this.buf.charAt(this.position);
	    return ch=='\r' || ch=='\n' || ch==undefined || ch=='';
	}

	p.reset=function(/*string, position, length*/)
	{
		this.buf=arguments.length>0 ? arguments[0] : null;
		this.start=arguments.length>1 ? arguments[1] : 0;
		this.end=arguments.length>2 ? this.start + arguments[2] : (this.buf==null ? 0 : this.buf.length);
		this.position=this.start;
		this.charset_offsets={};
	}

	p.current = function()
	{
	    if (this.position>=this.end)
	        return "\0";
		return this.buf.charAt(this.position);
	}

	p.remainder = function()
	{
		return this.buf.substr(this.position);
	}

	p.SkipToEof = function()
	{
		this.position=this.end;
	}

	p.SkipForward = function(count)
	{
		this.position+=count;
	}

	p.SkipToEol = function()
	{
		this.position = this.buf.indexOf('\n', this.position);
		if (this.position<0)
			this.position=this.end;
	}

	p.SkipEol = function()
	{
		var save=this.position;
		if (this.buf.charAt(this.position)=='\r')
			this.position++;
		if (this.buf.charAt(this.position)=='\n')
			this.position++;
		return this.position!=save;
	}

	p.SkipToNextLine = function()
	{
		this.SkipToEol();
		this.SkipEol();
	}

	p.CharAtOffset = function(offset)
	{
	    if (this.position+offset>=this.end)
	        return "\0";
		return this.buf.charAt(this.position+offset);
	}

	p.SkipChar = function(ch)
	{
		if (this.buf.charAt(this.position)==ch)
		{
			this.position++;
			return true;
		}
		return false;
	}
	p.SkipString= function(s)
	{
		if (this.buf.substr(this.position, s.length)==s)
		{
			this.position+=s.length;
			return true;
		}
		return false;
	}
	p.SkipWhitespace= function()
	{
		var save=this.position;
		while (true)
		{
			var ch=this.buf.charAt(this.position);
			if (ch!=' ' && ch!='\t' && ch!='\r' && ch!='\n')
				break;
			this.position++;				
		}
		return this.position!=save;
	}
	p.SkipLinespace= function()
	{
		var save=this.position;
		while (true)
		{
			var ch=this.buf.charAt(this.position);
			if (ch!=' ' && ch!='\t')
				break;
			this.position++;				
		}
		return this.position!=save;
	}
	p.FindRE=function(re)
	{
	    re.lastIndex=this.position;
	    var result=re.exec(this.buf);
	    if (result==null)
	    {
	        this.position=this.end;
	        return false;
	    }
	    
	    if (result.index + result[0].length > this.end)
	    {
	        this.position=this.end;
	        return false;
	    }
	
	    this.position=result.index;
        return true;
	}
	p.FindOneOf=function(charset)
	{
	    var next=-1;
        for (var ch in charset)
        {
            var charset_info=charset[ch];
            
            // Setup charset_info for this character
            if (charset_info==null)
            {
                charset_info={};
                charset_info.searched_from=-1;
                charset_info.found_at=-1;
                charset[ch]=charset_info;
            }
            
            // Search again?
            if (charset_info.searched_from==-1 || 
                this.position < charset_info.searched_from || 
                (this.position >= charset_info.found_at && charset_info.found_at!=-1))
            {
                charset_info.searched_from=this.position;
                charset_info.found_at=this.buf.indexOf(ch, this.position);
            }

            // Is this character next?            
            if (next==-1 || charset_info.found_at<next)
            {
                next=charset_info.found_at;
            }
            
        }
        
        if (next==-1)
        {
            next=this.end;
            return false;
        }
        
        p.position=next;
        return true;
	}
	p.Find= function(s)
	{
		this.position=this.buf.indexOf(s, this.position);
		if (this.position<0)
		{
			this.position=this.end;
			return false;
		}
		return true;
	}
	p.Mark= function()
	{
		this.mark=this.position;
	}
	p.Extract = function()
	{
		if (this.mark>=this.position)
			return "";
		else
			return this.buf.substr(this.mark, this.position-this.mark);
	}
	p.SkipIdentifier = function()
	{
		var ch=this.buf.charAt(this.position);
		if ((ch>='a' && ch<='z') || (ch>='A' && ch<='Z') || ch=='_')
		{
			this.position++;
			while (true)
			{
				var ch=this.buf.charAt(this.position);
				if ((ch>='a' && ch<='z') || (ch>='A' && ch<='Z') || ch=='_' || (ch>='0' && ch<='9'))
					this.position++;
				else
					return true;
			}
		}
		return false;
	}
	p.SkipHtmlEntity = function()
	{
	    if (this.buf.charAt(this.position)!='&')
	        return false;

	    var newpos=SkipHtmlEntity(this.buf, this.position);
	    if (newpos<0)
	        return false;
	        
        this.position=newpos;
        return true;
	}

    p.SkipEscapableChar = function()
    {
		if (this.buf.charAt(this.position) == '\\' && CharTypes.is_escapable(this.buf.charAt(this.position+1)))
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
    // HtmlTag
    
    HtmlTagFlags={};
    HtmlTagFlags.Block		= 0x0001;			// Block tag
    HtmlTagFlags.Inline		= 0x0002;			// Inline tag
    HtmlTagFlags.NoClosing	= 0x0004;			// No closing tag (eg: <hr> and <!-- -->)


    function HtmlTag(name)
    {
        this.name=name;
        this.attributes={};
        this.flags=0;
    }

    p=HtmlTag.prototype;
    p.attributes=null;
    p.closed=false;
    p.closing=false;
    
    p.attributeCount= function()
    {
        if (!this.attributes)
            return 0;
            
        var count=0;
        for (var x in this.attributes)
            count++;
            
        return count;
    }

    p.get_Flags = function()
    {
        if (this.flags==0)
        {
            this.flags=tag_flags[this.name.toLowerCase()]
            if (this.flags==undefined)
            {
                this.flags=HtmlTagFlags.Inline;
            }
        }
        return this.flags;
    }

    p.IsSafe = function()
    {
	    var name_lower=this.name.toLowerCase();
    	
	    // Check if tag is in whitelist
	    if (!allowed_tags[name_lower])
	        return false;

	    // Find allowed attributes
	    var allowed=allowed_attributes[name_lower];
	    if (!allowed)
	    {
	        return this.attributeCount()==0;
	    }
    	    
	    // No attributes?
	    if (!this.attributes)
	        return true;

	    // Check all are allowed
	    for (var i in this.attributes)
	    {
	        if (!allowed[i.toLowerCase()])
			    return false;
	    }

	    // Check href attribute is ok
	    if (this.attributes["href"])
	    {
	        if (!HtmlTag.IsSafeUrl(this.attributes["href"]))
	            return false;
	    }

	    if (this.attributes["src"])
	    {
	        if (!HtmlTag.IsSafeUrl(this.attributes["src"]))
	            return false;
	    }

	    // Passed all white list checks, allow it
	    return true;
    }

    HtmlTag.IsSafeUrl = function(url)
    {
        url=url.toLowerCase();
        return (url.substr(0, 7)=="http://" ||
                url.substr(0, 8)=="https://" ||
                url.substr(0, 6)=="ftp://")
    }

    HtmlTag.Parse=function(p)
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

    HtmlTag.ParseHelper=function(p)
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
			    var t = new HtmlTag("!");
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

	    // Probably a tag, create the HtmlTag object now
	    var tag = new HtmlTag(p.Extract());
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
			    while (!p.eof() && !CharTypes.is_whitespace(p.current()) && p.current() != '>' && p.current() != '/')
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


    allowed_tags = {
	    "b":1,"blockquote":1,"code":1,"dd":1,"dt":1,"dl":1,"del":1,"em":1,
	    "h1":1,"h2":1,"h3":1,"h4":1,"h5":1,"h6":1,"i":1,"kbd":1,"li":1,"ol":1,"ul":1,
	    "p":1, "pre":1, "s":1, "sub":1, "sup":1, "strong":1, "strike":1, "img":1, "a":1
    };

    allowed_attributes = {
        "a": { "href":1, "title":1 },
        "img": { "src":1, "width":1, "height":1, "alt":1, "title":1 }
    };
    		
    var b=HtmlTagFlags.Block;
    var i=HtmlTagFlags.Inline;
    var n=HtmlTagFlags.NoClosing;
    tag_flags= { 
			"p": b , 
            "div": b , 
            "h1": b , 
            "h2": b , 
            "h3": b , 
            "h4": b , 
            "h5": b , 
            "h6": b , 
            "blockquote": b , 
            "pre": b , 
            "table": b , 
            "dl": b , 
            "ol": b , 
            "ul": b , 
            "script": b , 
            "noscript": b , 
            "form": b , 
            "fieldset": b , 
            "iframe": b , 
            "math": b , 
            "ins": b | i , 
            "del": b | i , 
            "img": b | i , 
            "hr": b | n, 
            "!": b | n
            };
    delete b;
    delete i;
    delete n;  



    /////////////////////////////////////////////////////////////////////////////
    // LinkDefinition

    function LinkDefinition(id, url, title)
    {
        this.id=id;
        this.url=url;
        if (title==undefined)
            this.title=null;
        else
            this.title=title;
    }

    p=LinkDefinition.prototype;
    p.RenderLink=function(m, b, link_text)
    {
	    if (this.url.substr(0, 7).toLowerCase()=="mailto:")
	    {
		    b.Append("<a href=\"");
		    b.HtmlRandomize(this.url);
		    b.Append('\"');
		    if (this.title)
		    {
			    b.Append(" title=\"");
			    b.SmartHtmlEncodeAmpsAndAngles(this.title, 0, this.title.length);
			    b.Append('\"');
		    }
		    b.Append('>');
		    b.HtmlRandomize(link_text);
		    b.Append("</a>");
	    }
	    else
	    {
		    b.Append("<a href=\"");
		    b.SmartHtmlEncodeAmpsAndAngles(this.url, 0, this.url.length);
		    b.Append('\"');
		    if (this.title)
		    {
			    b.Append(" title=\"");
			    b.SmartHtmlEncodeAmpsAndAngles(this.title, 0, this.title.length);
			    b.Append('\"');
		    }
		    b.Append('>');
		    b.Append(link_text);	  // Link text already escaped by SpanFormatter
		    b.Append("</a>");
	    }
    }

    p.RenderImg=function(m, b, alt_text)
    {
	    b.Append("<img src=\"");
	    b.SmartHtmlEncodeAmpsAndAngles(this.url, 0, this.url.length);
	    b.Append('\"');
	    if (alt_text)
	    {
		    b.Append(" alt=\"");
		    b.SmartHtmlEncodeAmpsAndAngles(alt_text, 0, alt_text.length);
		    b.Append('\"');
	    }
	    if (this.title)
	    {
		    b.Append(" title=\"");
		    b.SmartHtmlEncodeAmpsAndAngles(this.title, 0, this.title.length);
		    b.Append('\"');
	    }
	    b.Append(" />");
    }

    LinkDefinition.ParseLinkDefinition=function(p)
    {
	    var savepos=p.position;
	    var l = LinkDefinition.ParseLinkDefinitionInternal(p);
	    if (l==null)
		    p.position = savepos;
	    return l;
    }

    LinkDefinition.ParseLinkDefinitionInternal=function(p)
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
    LinkDefinition.ParseLinkTarget=function(p, id)
    {
	    // Skip whitespace
	    p.SkipWhitespace();

	    // End of string?
	    if (p.eol())
		    return null;

	    // Create the link definition
	    var r = new LinkDefinition(id);

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
		    r.url = UnescapeString(Trim(url));

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
			    if (CharTypes.is_whitespace(ch))
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

		    r.url = UnescapeString(Trim(p.Extract()));
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
	    r.title = UnescapeString(p.Extract());

	    // Skip closing quote
	    p.SkipForward(1);

	    // Done!
	    return r;
    }


    /////////////////////////////////////////////////////////////////////////////
    // LinkInfo

    function LinkInfo(def, link_text)
    {
	    this.def = def;
	    this.link_text = link_text;
    }


    /////////////////////////////////////////////////////////////////////////////
    // Token

    TokenType = {}
    TokenType.Text=0;
    TokenType.HtmlTag=1;
    TokenType.Html=2;
    TokenType.open_em=3;
    TokenType.close_em=4;
    TokenType.open_strong=5;
    TokenType.close_strong=6;
    TokenType.code_span=7;
    TokenType.br=8;
    TokenType.link=9;
    TokenType.img=10;
    TokenType.opening_mark=11;
    TokenType.closing_mark=12;
    TokenType.internal_mark=13;

    function Token(type, startOffset, length)
    {
        this.type=type;
        this.startOffset=startOffset;
        this.length=length;
        this.data=null;
    }

    /////////////////////////////////////////////////////////////////////////////
    // SpanFormatter

    function SpanFormatter(markdown)
    {
        this.m_Markdown=markdown;
        this.m_Parser=new StringParser();
        this.m_SpareTokens=new Array();
        this.DisableLinks=false;
    }

    p=SpanFormatter.prototype;

    // Format part of a string into a destination string builder
    p.Format = function(dest, str, start, len) 
    {
        // Reset the string parser
        this.m_Parser.reset(str, start, len);

        // Parse the string into a list of tokens
        var tokens = this.Tokenize();
        if (tokens == null) 
        {
            // Nothing special, just html encode and write the entire string
            dest.HtmlEncode(str, start, len);
        }
        else 
        {
            // Render all tokens
            this.RenderTokens(dest, str, tokens);

            // Return all tokens to the spare token pool
            for (var i = 0; i < tokens.length; i++) 
            {
                this.FreeToken(tokens[i]);
            }
        }
    }

	// Format a string and return it as a new string
	// (used in formatting the text of links)
	p.FormatDirect=function(str)
	{
		var dest = new StringBuilder();
		this.Format(dest, str, 0, str.length);
		return dest.ToString();
	}

	// Render a list of tokens to a destination string builder.
    p.RenderTokens=function(sb, str, tokens)
    {
        var len=tokens.length;
	    for (var i=0; i<len; i++)
	    {
	        var t=tokens[i];
		    switch (t.type)
		    {
			    case TokenType.Text:
				    // Append encoded text
				    sb.HtmlEncode(str, t.startOffset, t.length);
				    break;

			    case TokenType.HtmlTag:
				    // Append html as is
				    sb.SmartHtmlEncodeAmps(str, t.startOffset, t.length);
				    break;

			    case TokenType.Html:
			    case TokenType.opening_mark:
			    case TokenType.closing_mark:
			    case TokenType.internal_mark:
				    // Append html as is
				    sb.Append(str.substr(t.startOffset, t.length));
				    break;

			    case TokenType.br:
				    sb.Append("<br />\n");
				    break;

			    case TokenType.open_em:
				    sb.Append("<em>");
				    break;

			    case TokenType.close_em:
				    sb.Append("</em>");
				    break;

			    case TokenType.open_strong:
				    sb.Append("<strong>");
				    break;

			    case TokenType.close_strong:
				    sb.Append("</strong>");
				    break;

			    case TokenType.code_span:
				    sb.Append("<code>");
				    sb.HtmlEncode(str, t.startOffset, t.length);
				    sb.Append("</code>");
				    break;

			    case TokenType.link:
			    {
				    var li = t.data;
				    var sf = new SpanFormatter(this.m_Markdown);
				    sf.DisableLinks = true;

				    li.def.RenderLink(this.m_Markdown, sb, sf.FormatDirect(li.link_text));
				    break;
			    }

			    case TokenType.img:
			    {
				    var li = t.data;
				    li.def.RenderImg(this.m_Markdown, sb, li.link_text);
				    break;
			    }
		    }
		}
    }

    p.Tokenize=function()
    {
        var p=this.m_Parser;
        
		var tokens = null;
		var emphasis_marks = null;
			
		//var charset={   '*':null, '_':null, '`':null, '[':null, '!':null, 
		//                '<':null, '&':null, ' ':null, '\\':null };
		
		var re=/[\*\_\`\[\!\<\&\ \\]/g;

		// Scan string
		var start_text_token = p.position;
		while (!p.eof())
		{
			if (!p.FindRE(re))
			    break;  

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
						case TokenType.internal_mark:
						case TokenType.opening_mark:
						case TokenType.closing_mark:
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
					var tag = HtmlTag.Parse(p);
					if (tag != null)
					{
						// Yes, create a token for it
						token = this.CreateToken(TokenType.HtmlTag, save, p.position - save);
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
						token = this.CreateToken(TokenType.Html, save, p.position - save);
					}

					break;
				}

				case ' ':
				{
					// Check for double space at end of a line
					if (p.CharAtOffset(1)==' ' && CharTypes.is_lineend(p.CharAtOffset(2)))
					{
						// Yes, skip it
						p.SkipForward(2);

						// Don't put br's at the end of a paragraph
						if (!p.eof())
						{
							p.SkipEol();
							token = this.CreateToken(TokenType.br, end_text_token, 0);
						}
					}
					break;
				}

				case '\\':
				{
					// Check followed by an escapable character
					if (CharTypes.is_escapable(p.CharAtOffset(1)))
					{
						token = this.CreateToken(TokenType.Text, p.position + 1, 1);
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
					tokens.push(this.CreateToken(TokenType.Text, start_text_token, end_text_token-start_text_token));
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
			tokens.push(this.CreateToken(TokenType.Text, start_text_token, p.position-start_text_token));
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
	p.CreateEmphasisMark=function()
	{
	    var p=this.m_Parser;
	    
		// Capture current state
		var ch = p.current();
		var altch = ch == '*' ? '_' : '*';
		var savepos = p.position;

		// Check for a consecutive sequence of just '_' and '*'
		if (p.bof() || CharTypes.is_whitespace(p.CharAtOffset(-1)))
		{
			while (CharTypes.is_emphasis(p.current()))
				p.SkipForward(1);

			if (p.eof() || CharTypes.is_whitespace(p.current()))
			{
				return this.CreateToken(TokenType.Html, savepos, p.position - savepos);
			}

			// Rewind
			p.position = savepos;
		}

		// Scan backwards and see if we have space before
		while (CharTypes.is_emphasis(p.CharAtOffset(-1)))
			p.SkipForward(-1);
		var bSpaceBefore = p.bof() || CharTypes.is_whitespace(p.CharAtOffset(-1));
		p.position = savepos;

		// Count how many matching emphasis characters
		while (p.current() == ch)
		{
			p.SkipForward(1);
		}
		var count=p.position-savepos;

		// Scan forwards and see if we have space after
		while (CharTypes.is_emphasis(p.CharAtOffset(1)))
			p.SkipForward(1);
		var bSpaceAfter = p.eof() || CharTypes.is_whitespace(p.CharAtOffset(1));
		p.position = savepos + count;

		if (bSpaceBefore)
		{
			return this.CreateToken(TokenType.opening_mark, savepos, p.position - savepos);
		}

		if (bSpaceAfter)
		{
			return this.CreateToken(TokenType.closing_mark, savepos, p.position - savepos);
		}

		return this.CreateToken(TokenType.internal_mark, savepos, p.position - savepos);
	}

	// Split mark token
	p.SplitMarkToken=function(tokens, marks, token, position)
	{
		// Create the new rhs token
		var tokenRhs = this.CreateToken(token.type, token.startOffset + position, token.length - position);

		// Adjust down the length of this token
		token.length = position;
		
		// Insert the new token into each of the parent collections
		marks.splice(marks.indexOf(token) +  1, 0, tokenRhs);
		tokens.splice(tokens.indexOf(token) + 1, 0, tokenRhs);

		// Return the new token
		return tokenRhs;
	}

	// Resolve emphasis marks (part 2)
	p.ResolveEmphasisMarks=function(tokens, marks)
	{
	    var input=this.m_Parser.buf;
	
		var bContinue = true;
		while (bContinue)
		{
			bContinue = false;
			for (var i = 0; i < marks.length; i++)
			{
				// Get the next opening or internal mark
				var opening_mark = marks[i];
				if (opening_mark.type != TokenType.opening_mark && opening_mark.type != TokenType.internal_mark)
					continue;

				// Look for a matching closing mark
				for (var j = i + 1; j < marks.length; j++)
				{
					// Get the next closing or internal mark
					var closing_mark = marks[j];
					if (closing_mark.type != TokenType.closing_mark && closing_mark.type != TokenType.internal_mark)
						break;

					// Ignore if different type (ie: `*` vs `_`)
					if (input.charAt(opening_mark.startOffset) != input.charAt(closing_mark.startOffset))
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
					opening_mark.type = style == 1 ? TokenType.open_em : TokenType.open_strong;
					closing_mark.type = style == 1 ? TokenType.close_em : TokenType.close_strong;

					// Remove the matched marks
					marks.splice(marks.indexOf(opening_mark), 1);
					marks.splice(marks.indexOf(closing_mark), 1);
					bContinue = true;

					break;
				}
			}
		}
	}

	// Process auto links eg: <google.com>
    p.ProcessAutoLink=function()
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
			if (CharTypes.is_whitespace(ch))
				break;

			// End found?
			if (ch == '>')
			{
			    var url = UnescapeString(p.Extract());

				var li = null;
				if (IsEmailAddress(url))
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

					li = new LinkInfo(new LinkDefinition("auto", url, null), link_text);
				}
				else if (IsWebAddress(url))
				{
					li=new LinkInfo(new LinkDefinition("auto", url, null), url);
				}

				if (li!=null)
				{
					p.SkipForward(1);
					return this.CreateDataToken(TokenType.link, li);
				}

				return null;
			}

			p.SkipEscapableChar();
		}

		// Didn't work
		return null;
	}

	// Process [link] and ![image] directives
    p.ProcessLinkOrImage=function()
	{
		if (this.DisableLinks)
			return null;
			
		var p=this.m_Parser;

		// Link or image?
		var token_type = p.SkipChar('!') ? TokenType.img : TokenType.link;

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
		var link_text = UnescapeString(p.Extract());

		// The closing ']'
		p.SkipForward(1);

		// Save position in case we need to rewind
		var savepos = p.position;

		// Inline links must follow immediately
		if (p.SkipChar('('))
		{
			// Extract the url and title
			var link_def = LinkDefinition.ParseLinkTarget(p, null);
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
                while (start>0 && CharTypes.is_whitespace(link_id.charAt(start-1)))
                    start--
                    
                var end=i;
                while (end<link_id.length && CharTypes.is_whitespace(link_id.charAt(end)))
                    end++;
                    
                link_id=link_id.substr(0, start) + " " + link_id.substr(end);
			}
		}

		// Find the link definition, abort if not defined
		var def = this.m_Markdown.GetLinkDefinition(link_id);
		if (def == null)
			return null;

		// Create a token
		return this.CreateDataToken(token_type, new LinkInfo(def, link_text));
	}

	// Process a ``` code span ```
    p.ProcessCodeSpan=function()
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
			return this.CreateToken(TokenType.Text, start, p.position - start);

		var startofcode = p.position;

		// Find closing ticks
		if (!p.Find(p.buf.substr(start, tickcount)))
			return this.CreateToken(TokenType.Text, start, p.position - start);

		// Save end position before backing up over trailing whitespace
		var endpos = p.position + tickcount;
		while (CharTypes.is_whitespace(p.CharAtOffset(-1)))
			p.SkipForward(-1);

		// Create the token, move back to the end and we're done
		var ret = this.CreateToken(TokenType.code_span, startofcode, p.position - startofcode);
		p.position = endpos;
		return ret;
	}

    p.CreateToken=function(type, startOffset, length)
	{
		if (this.m_SpareTokens.length != 0)
		{
			var t = this.m_SpareTokens.pop();
			t.type = type;
			t.startOffset = startOffset;
			t.length = length;
			t.data = null;
			return t;
		}
		else
			return new Token(type, startOffset, length);
	}

	// CreateToken - create or re-use a token object
	p.CreateDataToken=function(type, data)
	{
		if (this.m_SpareTokens.length != 0)
		{
			var t = this.m_SpareTokens.pop();
			t.type = type;
			t.data = data;
			return t;
		}
		else
		{
			var t=new Token(type, 0, 0);
			t.data=data;
			return t;
		}
	}

	// FreeToken - return a token to the spare token pool
	p.FreeToken=function(token)
	{
		token.data = null;
		this.m_SpareTokens.push(token);
	}



    /////////////////////////////////////////////////////////////////////////////
    // Block

    BlockType={};
    BlockType.Blank=0;
    BlockType.h1=1;
    BlockType.h2=2;
    BlockType.h3=3;
    BlockType.h4=4;
    BlockType.h5=5;
    BlockType.h6=6;
    BlockType.post_h1=7;
    BlockType.post_h2=8;
    BlockType.quote=9;		
    BlockType.ol_li=10;
    BlockType.ul_li=11;		
    BlockType.p=12;		
    BlockType.indent=13;			
    BlockType.hr=14;				
    BlockType.html=15,			
    BlockType.span=16;
    BlockType.codeblock=17;		
    BlockType.li=18;	
    BlockType.ol=19;			
    BlockType.ul=20;			

    function Block()
    {
    }

    
    p=Block.prototype;
    p.buf=null;
    p.blockType=BlockType.Blank;
	p.contentStart=0;
	p.contentLen=0;
	p.lineStart=0;
	p.lineLen=0;
	p.children=null;

	p.get_Content=function()
	{
		if (this.buf==null)
			return null;
		if (this.contentStart == -1)
		    return this.buf;
		   
		return this.buf.substr(this.contentStart, this.contentLen);
    }
	
	
	p.get_CodeContent=function()
	{
	    var s = new StringBuilder();
		for (var i=0; i<this.children.length; i++)
		{
			s.Append(this.children[i].get_Content());
			s.Append('\n');
		}
		return s.ToString();
	}


	p.RenderChildren=function(m, b)
	{
		for (var i=0; i<this.children.length; i++)
		{
			this.children[i].Render(m, b);
		}
	}

	p.Render=function(m, b)
	{
		switch (this.blockType)
		{
			case BlockType.Blank:
				return;

			case BlockType.p:
				b.Append("<p>");
				m.processSpan(b, this.buf, this.contentStart, this.contentLen);
				b.Append("</p>\n");
				break;

			case BlockType.span:
				m.processSpan(b, this.buf, this.contentStart, this.contentLen);
				b.Append("\n");
				break;

			case BlockType.h1:
			case BlockType.h2:
			case BlockType.h3:
			case BlockType.h4:
			case BlockType.h5:
			case BlockType.h6:
				b.Append("<h" + (this.blockType-BlockType.h1+1).toString() + ">");
				m.processSpan(b, this.buf, this.contentStart, this.contentLen);
				b.Append("</h" + (this.blockType-BlockType.h1+1).toString() + ">\n");
				break;

			case BlockType.hr:
				b.Append("<hr />\n");
				return;

			case BlockType.ol_li:
			case BlockType.ul_li:
				b.Append("<li>");
				m.processSpan(b, this.buf, this.contentStart, this.contentLen);
				b.Append("</li>\n");
				break;

			case BlockType.html:
				b.Append(this.buf.substr(this.contentStart, this.contentLen));
				return;

			case BlockType.codeblock:
				b.Append("<pre><code>");
				for (var i=0; i<this.children.length; i++)
				{
				    var line=this.children[i];
					b.HtmlEncodeAndConvertTabsToSpaces(line.buf, line.contentStart, line.contentLen);
					b.Append("\n");
				}
				b.Append("</code></pre>\n\n");
				return;

			case BlockType.quote:
				b.Append("<blockquote>\n");
				this.RenderChildren(m, b);
				b.Append("</blockquote>\n");
				return;

			case BlockType.li:
				b.Append("<li>\n");
				this.RenderChildren(m, b);
				b.Append("</li>\n");
				return;

			case BlockType.ol:
				b.Append("<ol>\n");
				this.RenderChildren(m, b);
				b.Append("</ol>\n");
				return;

			case BlockType.ul:
				b.Append("<ul>\n");
				this.RenderChildren(m, b);
				b.Append("</ul>\n");
				return;
		}
	}

    p.RevertToPlain=function()
	{
		this.blockType = BlockType.p;
		this.contentStart = this.lineStart;
		this.contentLen = this.lineLen;
	}

	p.get_contentEnd=function()
	{
    	return this.contentStart + this.contentLen;
	}
	
	p.set_contentEnd=function(value)
	{
		this.contentLen = value - this.contentStart;
	}

	// Count the leading spaces on a block
	// Used by list item evaluation to determine indent levels
	// irrespective of indent line type.
	p.get_leadingSpaces=function()
	{
		var count = 0;
		for (var i = this.lineStart; i < this.lineStart + this.lineLen; i++)
		{
			if (this.buf.charAt(i) == ' ')
			{
				count++;
			}
			else
			{
				break;
			}
		}
		return count;
	}

	p.CopyFrom=function(other)
	{
		this.blockType = other.blockType;
		this.buf = other.buf;
		this.contentStart = other.contentStart;
		this.contentLen = other.contentLen;
		this.lineStart = other.lineStart;
		this.lineLen = other.lineLen;
		return this;
	}

    /////////////////////////////////////////////////////////////////////////////
    // BlockProcessor


    function BlockProcessor(m)
    {
        this.m_Markdown=m;
        this.m_parentType=BlockType.Blank;
    }

    p=BlockProcessor.prototype;
    p.Process=function(str)
	{
		// Reset string parser
		var p=new StringParser(str);

		// The final set of blocks will be collected here
		var blocks = new Array();

		// The current paragraph/list/codeblock etc will be accumulated here
		// before being collapsed into a block and store in above `blocks` list
		var lines = new Array();

		// Add all blocks
		while (!p.eof())
		{
			// Get the next line
			var b = this.EvaluateLine(p);

			// SetExt header?
			if (b.blockType == BlockType.post_h1 || b.blockType == BlockType.post_h2)
			{
				if (lines.length > 0)
				{
					// Remove the previous line and collapse the current paragraph
					var prevline = lines.pop();
					this.CollapseLines(blocks, lines);
					
					// If previous line was blank, 
					if (prevline.blockType != BlockType.Blank)
					{
						// Convert the previous line to a heading and add to block list
						prevline.RevertToPlain();
						prevline.blockType = b.blockType == BlockType.post_h1 ? BlockType.h1 : BlockType.h2;
						blocks.push(prevline);
						continue;
					}
				}
				

				// Couldn't apply setext header to a previous line

				if (b.blockType == BlockType.post_h1)
				{
					// `===` gets converted to normal paragraph
					b.RevertToPlain();
					lines.push(b);
				}
				else
				{
					// `---` gets converted to hr
					if (b.contentLen >= 3)
					{
						b.blockType = BlockType.hr;
						blocks.push(b);
					}
					else
					{
						b.RevertToPlain();
						lines.push(b);
					}
				}

				continue;
			}


			// Work out the current paragraph type
			var currentBlockType = lines.length > 0 ? lines[0].blockType : BlockType.Blank;

			// Process this line
			switch (b.blockType)
			{
				case BlockType.Blank:
					switch (currentBlockType)
					{
						case BlockType.Blank:
							this.FreeBlock(b);
							break;

						case BlockType.p:
							this.CollapseLines(blocks, lines);
							this.FreeBlock(b);
							break;

						case BlockType.quote:
						case BlockType.ol_li:
						case BlockType.ul_li:
						case BlockType.indent:
							lines.push(b);
							break;
					}
					break;

				case BlockType.p:
					switch (currentBlockType)
					{
						case BlockType.Blank:
						case BlockType.p:
							lines.push(b);
							break;

						case BlockType.quote:
						case BlockType.ol_li:
						case BlockType.ul_li:
							var prevline = lines[lines.length-1];
							if (prevline.blockType == BlockType.Blank)
							{
								this.CollapseLines(blocks, lines);
								lines.push(b);
							}
							else
							{
								lines.push(b);
							}
							break;

						case BlockType.indent:
							this.CollapseLines(blocks, lines);
							lines.push(b);
							break;
					}
					break;

				case BlockType.indent:
					switch (currentBlockType)
					{
						case BlockType.Blank:
							// Start a code block
							lines.push(b);
							break;

						case BlockType.p:
						case BlockType.quote:
							var prevline = lines[lines.length-1];
							if (prevline.blockType == BlockType.Blank)
							{
								// Start a code block after a paragraph
								this.CollapseLines(blocks, lines);
								lines.push(b);
							}
							else
							{
								// indented line in paragraph, just continue it
								b.RevertToPlain();
								lines.push(b);
							}
							break;


						case BlockType.ol_li:
						case BlockType.ul_li:
						case BlockType.indent:
							lines.push(b);
							break;
					}
					break;

				case BlockType.quote:
					if (currentBlockType != BlockType.quote)
					{
						this.CollapseLines(blocks, lines);
					}
					lines.push(b);
					break;

				case BlockType.ol_li:
				case BlockType.ul_li:
					switch (currentBlockType)
					{
						case BlockType.Blank:
							lines.push(b);
							break;

						case BlockType.p:
						case BlockType.quote:
							var prevline = lines[lines.length-1];
							if (prevline.blockType == BlockType.Blank || this.m_parentType==BlockType.ol_li || this.m_parentType==BlockType.ul_li)
							{
								// List starting after blank line after paragraph or quote
								this.CollapseLines(blocks, lines);
								lines.push(b);
							}
							else
							{
								// List's can't start in middle of a paragraph
								b.RevertToPlain();
								lines.push(b);
							}
							break;

						case BlockType.ol_li:
						case BlockType.ul_li:
							if (b.blockType != currentBlockType)
							{
								this.CollapseLines(blocks, lines);
							}
							lines.push(b);
							break;

						case BlockType.indent:
							// List after code block
							this.CollapseLines(blocks, lines);
							lines.push(b);
							break;
					}
					break;

				case BlockType.h1:
				case BlockType.h2:
				case BlockType.h3:
				case BlockType.h4:
				case BlockType.h5:
				case BlockType.h6:
				case BlockType.html:
				case BlockType.hr:
					this.CollapseLines(blocks, lines);
					blocks.push(b);
					break;
			}
		}

		this.CollapseLines(blocks, lines);

		return blocks;
	}

	p.CreateBlock=function()
	{
		if (this.m_Markdown.m_SpareBlocks.length>1)
		{
		    return this.m_Markdown.m_SpareBlocks.pop();
		}
		else
		{
		    return new Block();
		}
	}

	p.FreeBlock=function(b)
	{
		this.m_Markdown.m_SpareBlocks.push(b);
	}

	p.FreeBlocks=function(blocks)
	{
	    for (var i=0; i<blocks.length; i++)
			this.m_Markdown.m_SpareBlocks.push(blocks[i]);
		blocks.length=0;
	}

	p.RenderLines=function(lines)
	{
		var b = this.m_Markdown.GetStringBuilder();
		for (var i=0; i<lines.length; i++)
		{
		    var l=lines[i];
			b.Append(l.buf.substr(l.contentStart, l.contentLen));
			b.Append('\n');
		}
		return b.ToString();
	}

	p.CollapseLines=function(blocks, lines)
	{
		// Remove trailing blank lines
		while (lines.length>0 && lines[lines.length-1].blockType == BlockType.Blank)
		{
			this.FreeBlock(lines.pop());
		}

		// Quit if empty
		if (lines.length == 0)
		{
			return;
		}


		// What sort of block?
		switch (lines[0].blockType)
		{
			case BlockType.p:
			{
				// Collapse all lines into a single paragraph
				var para = this.CreateBlock();
				para.blockType = BlockType.p;
				para.buf = lines[0].buf;
				para.contentStart = lines[0].contentStart;
				para.set_contentEnd(lines[lines.length-1].get_contentEnd());
				blocks.push(para);
				this.FreeBlocks(lines);
				break;
			}

			case BlockType.quote:
			{
			    // Get the content
			    var str=this.RenderLines(lines);
			    
			    // Create the new block processor
			    var bp=new BlockProcessor(this.m_Markdown);
			    bp.m_parentType=BlockType.quote;
			
				// Create a new quote block
				var quote = this.CreateBlock();
				quote.blockType = BlockType.quote;
				quote.children = bp.Process(str);
				this.FreeBlocks(lines);
				blocks.push(quote);
				break;
			}

			case BlockType.ol_li:
			case BlockType.ul_li:
				blocks.push(this.BuildList(lines));
				break;

			case BlockType.indent:
			{
				var codeblock = this.CreateBlock();
				codeblock.blockType=BlockType.codeblock;
				codeblock.children = new Array();
				for (var i=0; i<lines.length; i++)
				{
				    codeblock.children.push(lines[i]);
				}
				blocks.push(codeblock);
				lines.length=0;
				break;
			}
		}
	}

	p.EvaluateLine=function(p)
	{
		// Create a block
		var b=this.CreateBlock();

		// Store line start
		b.lineStart=p.position;
		b.buf=p.buf;

		// Scan the line
		b.contentStart = p.position;
		b.contentLen=-1;
		b.blockType=this.EvaluateLineInternal(p, b);

		// Move to end of line
		p.SkipToEol();

		// If end of line not returned, do it automatically
		if (b.contentLen < 0)
		{
			b.contentLen = p.position-b.contentStart;
		}

		// Setup line length
		b.lineLen=p.position-b.lineStart;

		// Next line
		p.SkipEol();

		// Create block
		return b;
	}

	p.EvaluateLineInternal=function(p, b)
	{
		// Empty line?
		if (p.eol())
			return BlockType.Blank;

		// Save start of line position
		var line_start= p.position;

		// ## Heading ##		
		var ch=p.current();
		if (ch == '#')
		{
			// Work out heading level
			var level = 1;
			p.SkipForward(1);
			while (p.current() == '#')
			{
				level++;
				p.SkipForward(1);
			}

			// Limit of 6
			if (level > 6)
				level = 6;

			// Skip any whitespace
			p.SkipWhitespace();

			// Save start position
			b.contentStart = p.position;

			// Jump to end and rewind over trailing hashes
			p.SkipToEol();
			while (p.position>b.contentStart && p.CharAtOffset(-1) == '#')
			{
				p.SkipForward(-1);
			}

			// Rewind over trailing spaces
			while (p.position>b.contentStart && CharTypes.is_whitespace(p.CharAtOffset(-1)))
			{
				p.SkipForward(-1);
			}

			// Create the heading block
			b.contentLen=p.position-b.contentStart;

			p.SkipToEol();
			return BlockType.h1 + (level - 1);
		}

		// Check for entire line as - or = for setext h1 and h2
		if (ch=='-' || ch=='=')
		{
			// Skip all matching characters
			var chType = ch;
			while (p.current()==chType)
			{
				p.SkipForward(1);
			}

			// Trailing whitespace allowed
			p.SkipLinespace();
			
			// If not at eol, must have found something other than setext header
			if (p.eol())
			{
				return chType == '=' ? BlockType.post_h1 : BlockType.post_h2;
			}
	
			p.position = line_start;
		}

		// Scan the leading whitespace, remembering how many spaces and where the first tab is
		var tabPos = -1;
		var leadingSpaces = 0;
		while (!p.eol())
		{
			if (p.current() == ' ')
			{
				if (tabPos < 0)
					leadingSpaces++;
			}
			else if (p.current() == '\t')
			{
				if (tabPos < 0)
					tabPos = p.position;
			}
			else
			{
				// Something else, get out
				break;
			}
			p.SkipForward(1);
		}

		// Blank line?
		if (p.eol())
		{
		    b.contentLen = 0;
			return BlockType.Blank;
		}

		// 4 leading spaces?
		if (leadingSpaces >= 4)
		{
			b.contentStart = line_start + 4;
			return BlockType.indent;
		}

		// Tab in the first 4 characters?
		if (tabPos >= 0 && tabPos - line_start<4)
		{
			b.contentStart = tabPos + 1;
			return BlockType.indent;
		}

		// Treat start of line as after leading whitespace
		b.contentStart = p.position;

		// Get the next character
		ch = p.current();

		// Html block?
		if (ch == '<')
		{
			// Parse html block
			if (this.ScanHtml(p))
			{
			    b.contentLen = p.position-b.contentStart;
				return BlockType.html;
			}

			// Rewind
			p.position = b.contentStart;
		}

		// Block quotes start with '>' and have one space or one tab following
		if (ch == '>')
		{
			// Block quote followed by space
			if (CharTypes.is_linespace(p.CharAtOffset(1)))
			{
				// Skip it and create quote block
				p.SkipForward(2);
				b.contentStart = p.position;
				return BlockType.quote;
			}

			p.SkipForward(1);
			b.contentStart = p.position;
			return BlockType.quote;
		}

		// Horizontal rule - a line consisting of 3 or more '-', '_' or '*' with optional spaces and nothing else
		if (ch == '-' || ch == '_' || ch == '*')
		{
			var count = 0;
			while (!p.eol())
			{
				var chType = p.current();
				if (p.current() == ch)
				{
					count++;
					p.SkipForward(1);
					continue;
				}

				if (CharTypes.is_linespace(p.current()))
				{
					p.SkipForward(1);
					continue;
				}

				break;
			}

			if (p.eol() && count >= 3)
			{
				return BlockType.hr;
			}

			// Rewind
			p.position = b.contentStart;
		}

		// Unordered list
		if ((ch == '*' || ch == '+' || ch == '-') && CharTypes.is_linespace(p.CharAtOffset(1)))
		{
			// Skip it
			p.SkipForward(1);
			p.SkipLinespace();
			b.contentStart = p.position;
			return BlockType.ul_li;
		}

		// Ordered list
		if (CharTypes.is_digit(ch))
		{
			// Ordered list?  A line starting with one or more digits, followed by a '.' and a space or tab

			// Skip all digits
			p.SkipForward(1);
			while (CharTypes.is_digit(p.current()))
				p.SkipForward(1);

			if (p.SkipChar('.') && p.SkipLinespace())
			{
				b.contentStart = p.position;
				return BlockType.ol_li;
			}

			p.position=b.contentStart;
		}

		// Reference link definition?
		if (ch == '[')
		{
			// Parse a link definition
			var l = LinkDefinition.ParseLinkDefinition(p);
			if (l!=null)
			{
				this.m_Markdown.AddLinkDefinition(l);
				return BlockType.Blank;
			}
		}

		// Nothing special
		return BlockType.p;
	}

	p.ScanHtml=function(p)
	{
		// Parse a HTML tag
		var openingTag = HtmlTag.Parse(p);
		if (openingTag == null)
			return false;

		// Closing tag?
		if (openingTag.closing)
			return false;

		var flags = openingTag.get_Flags();

		// Closed tag, hr or comment?
		if ((flags & HtmlTagFlags.NoClosing) != 0 || openingTag.closed)
		{
			p.SkipLinespace();
			p.SkipEol();
			return true;
		}

		// Is it a block level tag?
		if ((flags & HtmlTagFlags.Block)==0)
			return false;

		// Can it also be an inline tag?
		if ((flags & HtmlTagFlags.Inline) != 0)
		{
			// Yes, opening tag must be on a line by itself
			p.SkipLinespace();
			if (!p.eol())
				return false;
		}

		// Now capture everything up to the closing tag and put it all in a single HTML block
		var depth = 1;

		while (!p.eof())
		{
			if (p.current() != '<')
			{
				p.SkipForward(1);
				continue;
			}

			var tag = HtmlTag.Parse(p);
			if (tag == null)
			{
				p.SkipForward(1);
				continue;
			}

			// Same tag?
			if (tag.name == openingTag.name && !tag.closed)
			{
				if (tag.closing)
				{
					depth--;
					if (depth == 0)
					{
						// End of tag?
						p.SkipLinespace();
						p.SkipEol();
						return true;
					}
				}
				else
				{
					depth++;
				}
			}
		}

		// Missing closing tag(s).  
		return false;
	}

	/* 
	 * BuildList - build a single <ol> or <ul> list
	 */
	p.BuildList=function(lines)
	{
		// What sort of list are we dealing with
		var listType = lines[0].blockType;

		// Preprocess
		// 1. Collapse all plain lines (ie: handle hardwrapped lines)
		// 2. Promote any unindented lines that have more leading space 
		//    than the original list item to indented, including leading 
		//    specal chars
		var leadingSpace = lines[0].get_leadingSpaces();
		for (var i = 1; i < lines.length; i++)
		{
			// Join plain paragraphs
			if ((lines[i].blockType == BlockType.p) && 
				(lines[i - 1].blockType == BlockType.p || lines[i-1].blockType==listType))
			{
				lines[i - 1].set_contentEnd(lines[i].get_contentEnd());
				this.FreeBlock(lines[i]);
				lines.splice(i, 1);
				i--;
				continue;
			}

			if (lines[i].blockType != BlockType.indent && lines[i].blockType!=BlockType.Blank)
			{
				var thisLeadingSpace=lines[i].get_leadingSpaces();
				if (thisLeadingSpace > leadingSpace)
				{
					// Change line to indented, including original leading chars 
					// (eg: '* ', '>', '1.' etc...)
					lines[i].blockType = BlockType.indent;
					var saveend = lines[i].get_contentEnd();
					lines[i].contentStart = lines[i].lineStart + thisLeadingSpace;
					lines[i].set_contentEnd(saveend);
				}
			}
		}


		// Create the wrapping list item
		var List = this.CreateBlock();
		List.blockType=(listType == BlockType.ul_li ? BlockType.ul : BlockType.ol);
		List.children = new Array();

		// Process all lines in the range		
		for (var i = 0; i < lines.length; i++)
		{
			// Find start of item, including leading blanks
			var start_of_li = i;
			while (start_of_li > 0 && lines[start_of_li - 1].blockType == BlockType.Blank)
				start_of_li--;

			// Find end of the item, including trailing blanks
			var end_of_li = i;
			while (end_of_li < lines.length-1 && lines[end_of_li + 1].blockType != listType)
				end_of_li++;

			// Is this a simple or complex list item?
			if (start_of_li == end_of_li)
			{
				// It's a simple, single line item item
				List.children.push(this.CreateBlock().CopyFrom(lines[i]));
			}
			else
			{
				// Build a new string containing all child items
				var bAnyBlanks = false;
				var sb = this.m_Markdown.GetStringBuilder();
				for (var j = start_of_li; j <= end_of_li; j++)
				{
					var l=lines[j];
					sb.Append(l.buf.substr(l.contentStart, l.contentLen));
					sb.Append('\n');

					if (lines[j].blockType == BlockType.Blank)
					{
						bAnyBlanks = true;
					}
				}

				// Create the item and process child blocks
				var item = this.CreateBlock();
				item.blockType = BlockType.li;
				var bp=new BlockProcessor(this.m_Markdown)
				bp.m_parentType=listType;
				item.children = bp.Process(sb.ToString());

				// If no blank lines, change all contained paragraphs to plain text
				if (!bAnyBlanks)
				{
					for (var i=0; i<item.children.length; i++)
					{
					    var child=item.children[i];
						if (child.blockType == BlockType.p)
						{
							child.blockType = BlockType.span;
						}
					}
				}

				// Add the complex item
				List.children.push(item);
			}

			// Continue processing from end of li
			i = end_of_li;
		}

		this.FreeBlocks(lines);
		lines.length=0;

		// Continue processing after this item
		return List;
	}

    // Exposed stuff
    this.Markdown=Markdown;
    this.StringBuilder=StringBuilder;
    this.SpanFormatter=SpanFormatter;
    this.StringParser=StringParser;
    this.BlockProcessor=BlockProcessor;
    this.LinkDefinition=LinkDefinition;
    this.HtmlTag=HtmlTag;
    this.HtmlTagFlags=HtmlTagFlags;
    this.UnescapeString=UnescapeString;
    this.BlockType=BlockType;
}();

