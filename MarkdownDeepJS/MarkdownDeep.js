// 
//! MarkdownDeep - http://www.toptensoftware.com/markdowndeep
//! Copyright (C) 2010-2011 Topten Software
// 
//   Licensed under the Apache License, Version 2.0 (the "License"); you may not use this product except in 
//   compliance with the License. You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software distributed under the License is 
//   distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
//   See the License for the specific language governing permissions and limitations under the License.
//


/////////////////////////////////////////////////////////////////////////////
// Markdown

var MarkdownDeep = new function () {


    function array_indexOf(array, obj) {
        if (array.indexOf !== undefined)
            return array.indexOf(obj);

        for (var i = 0; i < array.length; i++) {
            if (array[i] === obj)
                return i;
        }

        return -1;
    };

    // private:p.
    // private:.m_*

    function Markdown() {
        this.m_SpanFormatter = new SpanFormatter(this);
        this.m_SpareBlocks = [];
        this.m_StringBuilder = new StringBuilder();
        this.m_StringBuilderFinal = new StringBuilder();
    }

    Markdown.prototype =
    {
        SafeMode: false,
        ExtraMode: false,
        MarkdownInHtml: false,
        AutoHeadingIDs: false,
        UrlBaseLocation: null,
        UrlRootLocation: null,
        NewWindowForExternalLinks: false,
        NewWindowForLocalLinks: false,
        NoFollowLinks: false,
        NoFollowExternalLinks: false,
        HtmlClassFootnotes: "footnotes",
        HtmlClassTitledImages: null,
        RenderingTitledImage: false,
        FormatCodeBlockAttributes: null,
        FormatCodeBlock: null,
        ExtractHeadBlocks: false,
        UserBreaks: false,
        HeadBlockContent: ""
    };

    var p = Markdown.prototype;

    function splice_array(dest, position, del, ins) {
        return dest.slice(0, position).concat(ins).concat(dest.slice(position + del));
    }

    Markdown.prototype.GetListItems = function (input, offset) {
        // Parse content into blocks
        var blocks = this.ProcessBlocks(input);


        // Find the block        
        var i;
        for (i = 0; i < blocks.length; i++) {
            var b = blocks[i];

            if ((b.blockType == BlockType_Composite || b.blockType == BlockType_html || b.blockType == BlockType_HtmlTag) && b.children) {
                blocks = splice_array(blocks, i, 1, b.children);
                i--;
                continue;
            }

            if (offset < b.lineStart) {
                break;
            }
        }

        i--;

        // Quit if at top
        if (i < 0)
            return null;

        // Get the block before
        var block = blocks[i];

        // Check if it's a list
        if (block.blockType != BlockType_ul && block.blockType != BlockType_ol)
            return null;

        // Build list of line offsets
        var list = [];
        var items = block.children;
        for (var j = 0; j < items.length; j++) {
            list.push(items[j].lineStart);
        }

        // Also push the line offset of the following block
        i++;
        if (i < blocks.length) {
            list.push(blocks[i].lineStart);
        }
        else {
            list.push(input.length);
        }

        return list;
    }

    // Main entry point    
    Markdown.prototype.Transform = function (input) {
        // Normalize line ends
        var rpos = input.indexOf("\r");
        if (rpos >= 0) {
            var npos = input.indexOf("\n");
            if (npos >= 0) {
                if (npos < rpos) {
                    input = input.replace(/\n\r/g, "\n");
                }
                else {
                    input = input.replace(/\r\n/g, "\n");
                }
            }

            input = input.replace(/\r/g, "\n");
        }

        this.HeadBlockContent = "";

        var blocks = this.ProcessBlocks(input);

        // Sort abbreviations by length, longest to shortest
        if (this.m_Abbreviations != null) {
            var list = [];
            for (var a in this.m_Abbreviations) {
                list.push(this.m_Abbreviations[a]);
            }
            list.sort(
		        function (a, b) {
		            return b.Abbr.length - a.Abbr.length;
		        }
            );
            this.m_Abbreviations = list;
        }

        // Render
        var sb = this.m_StringBuilderFinal;
        sb.Clear();
        for (var i = 0; i < blocks.length; i++) {
            var b = blocks[i];
            b.Render(this, sb);
        }

        // Render footnotes
        if (this.m_UsedFootnotes.length > 0) {

            sb.Append("\n<div class=\"");
            sb.Append(this.HtmlClassFootnotes);
            sb.Append("\">\n");
            sb.Append("<hr />\n");
            sb.Append("<ol>\n");
            for (var i = 0; i < this.m_UsedFootnotes.length; i++) {
                var fn = this.m_UsedFootnotes[i];

                sb.Append("<li id=\"fn:");
                sb.Append(fn.data); // footnote id
                sb.Append("\">\n");


                // We need to get the return link appended to the last paragraph
                // in the footnote
                var strReturnLink = "<a href=\"#fnref:" + fn.data + "\" rev=\"footnote\">&#8617;</a>";

                // Get the last child of the footnote
                var child = fn.children[fn.children.length - 1];
                if (child.blockType == BlockType_p) {
                    child.blockType = BlockType_p_footnote;
                    child.data = strReturnLink;
                }
                else {
                    child = new Block();
                    child.contentLen = 0;
                    child.blockType = BlockType_p_footnote;
                    child.data = strReturnLink;
                    fn.children.push(child);
                }


                fn.Render(this, sb);

                sb.Append("</li>\n");
            }
            sb.Append("</ol>\n");
            sb.Append("</div>\n");
        }


        // Done
        return sb.ToString();
    }

    Markdown.prototype.OnQualifyUrl = function (url) {
        // Is the url a fragment?
        if (starts_with(url, "#"))
            return url;

        // Is the url already fully qualified?
        if (IsUrlFullyQualified(url))
            return url;

        if (starts_with(url, "/")) {
            var rootLocation = this.UrlRootLocation;
            if (!rootLocation) {
                // Quit if we don't have a base location
                if (!this.UrlBaseLocation)
                    return url;

                // Need to find domain root
                var pos = this.UrlBaseLocation.indexOf("://");
                if (pos == -1)
                    pos = 0;
                else
                    pos += 3;

                // Find the first slash after the protocol separator
                pos = this.UrlBaseLocation.indexOf('/', pos);

                // Get the domain name
                rootLocation = pos < 0 ? this.UrlBaseLocation : this.UrlBaseLocation.substr(0, pos);
            }

            // Join em
            return rootLocation + url;
        }
        else {
            // Quit if we don't have a base location
            if (!this.UrlBaseLocation)
                return url;

            if (!ends_with(this.UrlBaseLocation, "/"))
                return this.UrlBaseLocation + "/" + url;
            else
                return this.UrlBaseLocation + url;
        }
    }


    // Override and return an object with width and height properties
    Markdown.prototype.OnGetImageSize = function (image, TitledImage) {
        return null;
    }

    Markdown.prototype.OnPrepareLink = function (tag) {
        var url = tag.attributes["href"];

        // No follow?
        if (this.NoFollowLinks) {
            tag.attributes["rel"] = "nofollow";
        }

        if (this.NoFollowExternalLinks) {
            if (IsUrlFullyQualified(url)) {
                tag.attributes["rel"] = "nofollow";
            }
        }

        // New window?
        if ((this.NewWindowForExternalLinks && IsUrlFullyQualified(url)) ||
			 (this.NewWindowForLocalLinks && !IsUrlFullyQualified(url))) {
            tag.attributes["target"] = "_blank";
        }

        // Qualify url
        tag.attributes["href"] = this.OnQualifyUrl(url);
    }

    Markdown.prototype.OnPrepareImage = function (tag, TitledImage) {
        // Try to determine width and height
        var size = this.OnGetImageSize(tag.attributes["src"], TitledImage);
        if (size != null) {
            tag.attributes["width"] = size.width;
            tag.attributes["height"] = size.height;
        }

        // Now qualify the url
        tag.attributes["src"] = this.OnQualifyUrl(tag.attributes["src"]);
    }

    // Get a link definition
    Markdown.prototype.GetLinkDefinition = function (id) {
        if (this.m_LinkDefinitions.hasOwnProperty(id))
            return this.m_LinkDefinitions[id];
        else
            return null;
    }

    // Split the markdown into sections, one section for each
 	// top level heading
    var SplitUserSections = function(markdown) {

		// Build blocks
		var md = new Markdown();
		md.UserBreaks = true;

		// Process blocks
		var blocks = md.ProcessBlocks(markdown);

		// Create sections
		var Sections = [];
		var iPrevSectionOffset = 0;
		for (var i = 0; i < blocks.length; i++)
		{
			var b = blocks[i];
			if (b.blockType==BlockType_user_break)
			{
			    // Get the offset of the section
			    var iSectionOffset = b.lineStart;

				// Add section
				Sections.push(markdown.substr(iPrevSectionOffset, iSectionOffset - iPrevSectionOffset).trim());

				// Next section starts on next line
				if (i + 1 < blocks.length)
				{
					iPrevSectionOffset = blocks[i + 1].lineStart;
					if (iPrevSectionOffset==0)
						iPrevSectionOffset = blocks[i + 1].contentStart;
				}
				else
					iPrevSectionOffset = markdown.length;
			}
		}

		// Add the last section
		if (markdown.length > iPrevSectionOffset)
		{
			Sections.push(markdown.substring(iPrevSectionOffset).trim());
		}

		return Sections;
	}


    p.ProcessBlocks = function (str) {
        // Reset the list of link definitions
        this.m_LinkDefinitions = [];
        this.m_Footnotes = [];
        this.m_UsedFootnotes = [];
        this.m_UsedHeaderIDs = [];
        this.m_Abbreviations = null;

        // Process blocks
        return new BlockProcessor(this, this.MarkdownInHtml).Process(str);
    }

    // Add a link definition
    p.AddLinkDefinition = function (link) {
        this.m_LinkDefinitions[link.id] = link;
    }

    p.AddFootnote = function (footnote) {
        this.m_Footnotes[footnote.data] = footnote;
    }

    // Look up a footnote, claim it and return it's index (or -1 if not found)
    p.ClaimFootnote = function (id) {
        var footnote = this.m_Footnotes[id];
        if (footnote != undefined) {
            // Move the foot note to the used footnote list
            this.m_UsedFootnotes.push(footnote);
            delete this.m_Footnotes[id];

            // Return it's display index
            return this.m_UsedFootnotes.length - 1;
        }
        else
            return -1;
    }

    p.AddAbbreviation = function (abbr, title) {
        if (this.m_Abbreviations == null) {
            this.m_Abbreviations = [];
        }

        // Store abbreviation
        this.m_Abbreviations[abbr] = { Abbr: abbr, Title: title };
    }

    p.GetAbbreviations = function () {
        return this.m_Abbreviations;
    }




    // private
    p.MakeUniqueHeaderID = function (strHeaderText, startOffset, length) {
        if (!this.AutoHeadingIDs)
            return null;

        // Extract a pandoc style cleaned header id from the header text
        var strBase = this.m_SpanFormatter.MakeID(strHeaderText, startOffset, length);

        // If nothing left, use "section"
        if (!strBase)
            strBase = "section";

        // Make sure it's unique by append -n counter
        var strWithSuffix = strBase;
        var counter = 1;
        while (this.m_UsedHeaderIDs[strWithSuffix] != undefined) {
            strWithSuffix = strBase + "-" + counter.toString();
            counter++;
        }

        // Store it
        this.m_UsedHeaderIDs[strWithSuffix] = true;

        // Return it
        return strWithSuffix;
    }


    // private
    p.GetStringBuilder = function () {
        this.m_StringBuilder.Clear();
        return this.m_StringBuilder;
    }

    /////////////////////////////////////////////////////////////////////////////
    // CharTypes

    function is_digit(ch) {
        return ch >= '0' && ch <= '9';
    }
    function is_hex(ch) {
        return (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F');
    }
    function is_alpha(ch) {
        return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
    }
    function is_alphadigit(ch) {
        return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9');
    }
    function is_whitespace(ch) {
        return (ch == ' ' || ch == '\t' || ch == '\r' || ch == '\n');
    }
    function is_linespace(ch) {
        return (ch == ' ' || ch == '\t');
    }
    function is_lineend(ch) {
        return (ch == '\r' || ch == '\n');
    }
    function is_emphasis(ch) {
        return (ch == '*' || ch == '_');
    }
    function is_escapable(ch, ExtraMode) {
        switch (ch) {
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
            case '>':
            case '#':
            case '+':
            case '-':
            case '.':
            case '!':
                return true;

            case ':':
            case '|':
            case '=':
            case '<':
                return ExtraMode;
        }

        return false;
    }


    // Utility functions

    // Check if str[pos] looks like a html entity
    // Returns -1 if not, or offset of character after it yes.
    function SkipHtmlEntity(str, pos) {
        if (str.charAt(pos) != '&')
            return -1;

        var save = pos;
        pos++;

        var fn_test;
        if (str.charAt(pos) == '#') {
            pos++;
            if (str.charAt(pos) == 'x' || str.charAt(pos) == 'X') {
                pos++;
                fn_test = is_hex;
            }
            else {
                fn_test = is_digit;
            }
        }
        else {
            fn_test = is_alphadigit;
        }

        if (fn_test(str.charAt(pos))) {
            pos++;
            while (fn_test(str.charAt(pos)))
                pos++;

            if (str.charAt(pos) == ';') {
                pos++;
                return pos;
            }
        }

        pos = save;
        return -1;
    }

    function UnescapeString(str, ExtraMode) {
        // Find first backslash
        var bspos = str.indexOf('\\');
        if (bspos < 0)
            return str;

        // Build new string with escapable backslashes removed
        var b = new StringBuilder();
        var piece = 0;
        while (bspos >= 0) {
            if (is_escapable(str.charAt(bspos + 1), ExtraMode)) {
                if (bspos > piece)
                    b.Append(str.substr(piece, bspos - piece));

                piece = bspos + 1;
            }

            bspos = str.indexOf('\\', bspos + 1);
        }

        if (piece < str.length)
            b.Append(str.substr(piece, str.length - piece));

        return b.ToString();
    }

    function Trim(str) {
        var i = 0;
        var l = str.length;

        while (i < l && is_whitespace(str.charAt(i)))
            i++;
        while (l - 1 > i && is_whitespace(str.charAt(l - 1)))
            l--;

        return str.substr(i, l - i);
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
    function IsEmailAddress(str) {
        var posAt = str.indexOf('@');
        if (posAt < 0)
            return false;

        var posLastDot = str.lastIndexOf('.');
        if (posLastDot < posAt)
            return false;

        return true;
    }

    // Check if a string looks like a url
    function IsWebAddress(str) {
        str = str.toLowerCase();
        if (str.substr(0, 7) == "http://")
            return true;
        if (str.substr(0, 8) == "https://")
            return true;
        if (str.substr(0, 6) == "ftp://")
            return true;
        if (str.substr(0, 7) == "file://")
            return true;

        return false;
    }


    // Check if a string is a valid HTML ID identifier
    function IsValidHtmlID(str) {
        if (!str)
            return false;

        // Must start with a letter
        if (!is_alpha(str.charAt(0)))
            return false;

        // Check the rest
        for (var i = 0; i < str.length; i++) {
            var ch = str.charAt(i);
            if (is_alphadigit(ch) || ch == '_' || ch == '-' || ch == ':' || ch == '.')
                continue;

            return false;
        }

        // OK
        return true;
    }

    // Strip the trailing HTML ID from a header string
    // ie:      ## header text ##			{#<idhere>}
    //			^start           ^out end              ^end
    //
    // Returns null if no header id
    function StripHtmlID(str, start, end) {
        // Skip trailing whitespace
        var pos = end - 1;
        while (pos >= start && is_whitespace(str.charAt(pos))) {
            pos--;
        }

        // Skip closing '{'
        if (pos < start || str.charAt(pos) != '}')
            return null;

        var endId = pos;
        pos--;

        // Find the opening '{'
        while (pos >= start && str.charAt(pos) != '{')
            pos--;

        // Check for the #
        if (pos < start || str.charAt(pos + 1) != '#')
            return null;

        // Extract and check the ID
        var startId = pos + 2;
        var strID = str.substr(startId, endId - startId);
        if (!IsValidHtmlID(strID))
            return null;

        // Skip any preceeding whitespace
        while (pos > start && is_whitespace(str.charAt(pos - 1)))
            pos--;

        // Done!
        return { id: strID, end: pos };
    }

    function starts_with(str, match) {
        return str.substr(0, match.length) == match;
    }

    function ends_with(str, match) {
        return str.substr(-match.length) == match;
    }

    function IsUrlFullyQualified(url) {
        return url.indexOf("://") >= 0 || starts_with(url, "mailto:");
    }


    /////////////////////////////////////////////////////////////////////////////
    // StringBuilder

    function StringBuilder() {
        this.m_content = [];
    }

    p = StringBuilder.prototype;

    p.Append = function (value) {
        if (value)
            this.m_content.push(value);
    }
    p.Clear = function () {
        this.m_content.length = 0;
    }
    p.ToString = function () {
        return this.m_content.join("");
    }

    p.HtmlRandomize = function (url) {
        // Randomize
        var len = url.length;
        for (var i = 0; i < len; i++) {
            var x = Math.random();
            if (x > 0.90 && url.charAt(i) != '@') {
                this.Append(url.charAt(i));
            }
            else if (x > 0.45) {
                this.Append("&#");
                this.Append(url.charCodeAt(i).toString());
                this.Append(";");
            }
            else {
                this.Append("&#x");
                this.Append(url.charCodeAt(i).toString(16));
                this.Append(";");
            }
        }
    }

    p.HtmlEncode = function (str, startOffset, length) {
        var end = startOffset + length;
        var piece = startOffset;
        var i;
        for (i = startOffset; i < end; i++) {
            switch (str.charAt(i)) {
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

    p.SmartHtmlEncodeAmpsAndAngles = function (str, startOffset, length) {
        var end = startOffset + length;
        var piece = startOffset;
        var i;
        for (i = startOffset; i < end; i++) {
            switch (str.charAt(i)) {
                case '&':
                    var after = SkipHtmlEntity(str, i);
                    if (after < 0) {
                        if (i > piece) {
                            this.Append(str.substr(piece, i - piece));
                        }
                        this.Append("&amp;");
                        piece = i + 1;
                    }
                    else {
                        i = after - 1;
                    }
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

    p.SmartHtmlEncodeAmps = function (str, startOffset, length) {
        var end = startOffset + length;
        var piece = startOffset;
        var i;
        for (i = startOffset; i < end; i++) {
            switch (str.charAt(i)) {
                case '&':
                    var after = SkipHtmlEntity(str, i);
                    if (after < 0) {
                        if (i > piece) {
                            this.Append(str.substr(piece, i - piece));
                        }
                        this.Append("&amp;");
                        piece = i + 1;
                    }
                    else {
                        i = after - 1;
                    }
                    break;
            }
        }

        if (i > piece)
            this.Append(str.substr(piece, i - piece));
    }


    p.HtmlEncodeAndConvertTabsToSpaces = function (str, startOffset, length) {
        var end = startOffset + length;
        var piece = startOffset;
        var pos = 0;
        var i;
        for (i = startOffset; i < end; i++) {
            switch (str.charAt(i)) {
                case '\t':

                    if (i > piece) {
                        this.Append(str.substr(piece, i - piece));
                    }
                    piece = i + 1;

                    this.Append(' ');
                    pos++;
                    while ((pos % 4) != 0) {
                        this.Append(' ');
                        pos++;
                    }
                    pos--; 	// Compensate for the pos++ below
                    break;

                case '\r':
                case '\n':
                    if (i > piece)
                        this.Append(str.substr(piece, i - piece));
                    this.Append('\n');
                    piece = i + 1;
                    continue;

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

            pos++;
        }

        if (i > piece)
            this.Append(str.substr(piece, i - piece));
    }




    /////////////////////////////////////////////////////////////////////////////
    // StringScanner

    function StringScanner() {
        this.reset.apply(this, arguments);
    }

    p = StringScanner.prototype;
    p.bof = function () {
        return this.m_position == this.start;
    }

    p.eof = function () {
        return this.m_position >= this.end;
    }

    p.eol = function () {
        if (this.m_position >= this.end)
            return true;
        var ch = this.buf.charAt(this.m_position);
        return ch == '\r' || ch == '\n' || ch == undefined || ch == '';
    }

    p.reset = function (/*string, position, length*/) {
        this.buf = arguments.length > 0 ? arguments[0] : null;
        this.start = arguments.length > 1 ? arguments[1] : 0;
        this.end = arguments.length > 2 ? this.start + arguments[2] : (this.buf == null ? 0 : this.buf.length);
        this.m_position = this.start;
        this.charset_offsets = {};
    }

    p.current = function () {
        if (this.m_position >= this.end)
            return "\0";
        return this.buf.charAt(this.m_position);
    }

    p.remainder = function () {
        return this.buf.substr(this.m_position);
    }

    p.SkipToEof = function () {
        this.m_position = this.end;
    }

    p.SkipForward = function (count) {
        this.m_position += count;
    }

    p.SkipToEol = function () {
        this.m_position = this.buf.indexOf('\n', this.m_position);
        if (this.m_position < 0)
            this.m_position = this.end;
    }

    p.SkipEol = function () {
        var save = this.m_position;
        if (this.buf.charAt(this.m_position) == '\r')
            this.m_position++;
        if (this.buf.charAt(this.m_position) == '\n')
            this.m_position++;
        return this.m_position != save;
    }

    p.SkipToNextLine = function () {
        this.SkipToEol();
        this.SkipEol();
    }

    p.CharAtOffset = function (offset) {
        if (this.m_position + offset >= this.end)
            return "\0";
        return this.buf.charAt(this.m_position + offset);
    }

    p.SkipChar = function (ch) {
        if (this.buf.charAt(this.m_position) == ch) {
            this.m_position++;
            return true;
        }
        return false;
    }
    p.SkipString = function (s) {
        if (this.buf.substr(this.m_position, s.length) == s) {
            this.m_position += s.length;
            return true;
        }
        return false;
    }
    p.SkipWhitespace = function () {
        var save = this.m_position;
        while (true) {
            var ch = this.buf.charAt(this.m_position);
            if (ch != ' ' && ch != '\t' && ch != '\r' && ch != '\n')
                break;
            this.m_position++;
        }
        return this.m_position != save;
    }
    p.SkipLinespace = function () {
        var save = this.m_position;
        while (true) {
            var ch = this.buf.charAt(this.m_position);
            if (ch != ' ' && ch != '\t')
                break;
            this.m_position++;
        }
        return this.m_position != save;
    }
    p.FindRE = function (re) {
        re.lastIndex = this.m_position;
        var result = re.exec(this.buf);
        if (result == null) {
            this.m_position = this.end;
            return false;
        }

        if (result.index + result[0].length > this.end) {
            this.m_position = this.end;
            return false;
        }

        this.m_position = result.index;
        return true;
    }
    p.FindOneOf = function (charset) {
        var next = -1;
        for (var ch in charset) {
            var charset_info = charset[ch];

            // Setup charset_info for this character
            if (charset_info == null) {
                charset_info = {};
                charset_info.m_searched_from = -1;
                charset_info.m_found_at = -1;
                charset[ch] = charset_info;
            }

            // Search again?
            if (charset_info.m_searched_from == -1 ||
                this.m_position < charset_info.m_searched_from ||
                (this.m_position >= charset_info.m_found_at && charset_info.m_found_at != -1)) {
                charset_info.m_searched_from = this.m_position;
                charset_info.m_found_at = this.buf.indexOf(ch, this.m_position);
            }

            // Is this character next?            
            if (next == -1 || charset_info.m_found_at < next) {
                next = charset_info.m_found_at;
            }

        }

        if (next == -1) {
            next = this.end;
            return false;
        }

        p.m_position = next;
        return true;
    }
    p.Find = function (s) {
        this.m_position = this.buf.indexOf(s, this.m_position);
        if (this.m_position < 0) {
            this.m_position = this.end;
            return false;
        }
        return true;
    }
    p.Mark = function () {
        this.mark = this.m_position;
    }
    p.Extract = function () {
        if (this.mark >= this.m_position)
            return "";
        else
            return this.buf.substr(this.mark, this.m_position - this.mark);
    }
    p.SkipIdentifier = function () {
        var ch = this.buf.charAt(this.m_position);
        if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch == '_') {
            this.m_position++;
            while (true) {
                ch = this.buf.charAt(this.m_position);
                if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch == '_' || (ch >= '0' && ch <= '9'))
                    this.m_position++;
                else
                    return true;
            }
        }
        return false;
    }

    p.SkipFootnoteID = function () {
        var savepos = this.m_position;

        this.SkipLinespace();

        this.Mark();

        while (true) {
            var ch = this.current();
            if (is_alphadigit(ch) || ch == '-' || ch == '_' || ch == ':' || ch == '.' || ch == ' ')
                this.SkipForward(1);
            else
                break;
        }

        if (this.m_position > this.mark) {
            var id = Trim(this.Extract());
            if (id.length > 0) {
                this.SkipLinespace();
                return id;
            }
        }

        this.m_position = savepos;
        return null;
    }

    p.SkipHtmlEntity = function () {
        if (this.buf.charAt(this.m_position) != '&')
            return false;

        var newpos = SkipHtmlEntity(this.buf, this.m_position);
        if (newpos < 0)
            return false;

        this.m_position = newpos;
        return true;
    }

    p.SkipEscapableChar = function (ExtraMode) {
        if (this.buf.charAt(this.m_position) == '\\' && is_escapable(this.buf.charAt(this.m_position + 1), ExtraMode)) {
            this.m_position += 2;
            return true;
        }
        else {
            if (this.m_position < this.end)
                this.m_position++;
            return false;
        }
    }


    /////////////////////////////////////////////////////////////////////////////
    // HtmlTag

    var HtmlTagFlags_Block = 0x0001; 	// Block tag
    var HtmlTagFlags_Inline = 0x0002; 	// Inline tag
    var HtmlTagFlags_NoClosing = 0x0004; 	// No closing tag (eg: <hr> and <!-- -->)
    var HtmlTagFlags_ContentAsSpan = 0x0008;        // When markdown=1 treat content as span, not block


    function HtmlTag(name) {
        this.name = name;
        this.attributes = {};
        this.flags = 0;
        this.closed = false;
        this.closing = false;
    }

    p = HtmlTag.prototype;

    p.attributeCount = function () {
        if (!this.attributes)
            return 0;

        var count = 0;
        for (var x in this.attributes)
            count++;

        return count;
    }

    p.get_Flags = function () {
        if (this.flags == 0) {
            this.flags = tag_flags[this.name.toLowerCase()];
            if (this.flags == undefined) {
                this.flags = HtmlTagFlags_Inline;
            }
        }
        return this.flags;
    }

    p.IsSafe = function () {
        var name_lower = this.name.toLowerCase();

        // Check if tag is in whitelist
        if (!allowed_tags[name_lower])
            return false;

        // Find allowed attributes
        var allowed = allowed_attributes[name_lower];
        if (!allowed) {
            return this.attributeCount() == 0;
        }

        // No attributes?
        if (!this.attributes)
            return true;

        // Check all are allowed
        for (var i in this.attributes) {
            if (!allowed[i.toLowerCase()])
                return false;
        }

        // Check href attribute is ok
        if (this.attributes["href"]) {
            if (!IsSafeUrl(this.attributes["href"]))
                return false;
        }

        if (this.attributes["src"]) {
            if (!IsSafeUrl(this.attributes["src"]))
                return false;
        }

        // Passed all white list checks, allow it
        return true;
    }

    // Render opening tag (eg: <tag attr="value">
    p.RenderOpening = function (dest) {
        dest.Append("<");
        dest.Append(this.name);
        for (var i in this.attributes) {
            dest.Append(" ");
            dest.Append(i);
            dest.Append("=\"");
            dest.Append(this.attributes[i]);
            dest.Append("\"");
        }

        if (this.closed)
            dest.Append(" />");
        else
            dest.Append(">");
    }

    // Render closing tag (eg: </tag>)
    p.RenderClosing = function (dest) {
        dest.Append("</");
        dest.Append(this.name);
        dest.Append(">");
    }



    function IsSafeUrl(url) {
        url = url.toLowerCase();
        return (url.substr(0, 7) == "http://" ||
                url.substr(0, 8) == "https://" ||
                url.substr(0, 6) == "ftp://");
    }

    function ParseHtmlTag(p) {
        // Save position
        var savepos = p.m_position;

        // Parse it
        var ret = ParseHtmlTagHelper(p);
        if (ret != null)
            return ret;

        // Rewind if failed
        p.m_position = savepos;
        return null;
    }

    function ParseHtmlTagHelper(p) {
        // Does it look like a tag?
        if (p.current() != '<')
            return null;

        // Skip '<'
        p.SkipForward(1);

        // Is it a comment?
        if (p.SkipString("!--")) {
            p.Mark();

            if (p.Find("-->")) {
                var t = new HtmlTag("!");
                t.attributes["content"] = p.Extract();
                t.closed = true;
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
        if (bClosing) {
            if (p.current() != '>')
                return null;

            p.SkipForward(1);
            return tag;
        }


        while (!p.eof()) {
            // Skip whitespace
            p.SkipWhitespace();

            // Check for closed tag eg: <hr />
            if (p.SkipString("/>")) {
                tag.closed = true;
                return tag;
            }

            // End of tag?
            if (p.SkipChar('>')) {
                return tag;
            }

            // attribute name
            p.Mark();
            if (!p.SkipIdentifier())
                return null;
            var attributeName = p.Extract();

            // Skip whitespace
            p.SkipWhitespace();

            // Skip equal sign
            if (p.SkipChar('=')) {

                // Skip whitespace
                p.SkipWhitespace();

                // Optional quotes
                if (p.SkipChar('\"')) {
                    // Scan the value
                    p.Mark();
                    if (!p.Find('\"'))
                        return null;

                    // Store the value
                    tag.attributes[attributeName] = p.Extract();

                    // Skip closing quote
                    p.SkipForward(1);
                }
                else {
                    // Scan the value
                    p.Mark();
                    while (!p.eof() && !is_whitespace(p.current()) && p.current() != '>' && p.current() != '/')
                        p.SkipForward(1);

                    if (!p.eof()) {
                        // Store the value
                        tag.attributes[attributeName] = p.Extract();
                    }
                }
            }
            else {
                tag.attributes[attributeName] = "";
            }
        }

        return null;
    }


    var allowed_tags = {
        "b": 1, "blockquote": 1, "code": 1, "dd": 1, "dt": 1, "dl": 1, "del": 1, "em": 1,
        "h1": 1, "h2": 1, "h3": 1, "h4": 1, "h5": 1, "h6": 1, "i": 1, "kbd": 1, "li": 1, "ol": 1, "ul": 1,
        "p": 1, "pre": 1, "s": 1, "sub": 1, "sup": 1, "strong": 1, "strike": 1, "img": 1, "a": 1
    };

    var allowed_attributes = {
        "a": { "href": 1, "title": 1, "class": 1 },
        "img": { "src": 1, "width": 1, "height": 1, "alt": 1, "title": 1, "class": 1 }
    };

    var b = HtmlTagFlags_Block;
    var i = HtmlTagFlags_Inline;
    var n = HtmlTagFlags_NoClosing;
    var s = HtmlTagFlags_ContentAsSpan;
    var tag_flags = {
        "p": b | s,
        "div": b,
        "h1": b | s,
        "h2": b | s,
        "h3": b | s,
        "h4": b | s,
        "h5": b | s,
        "h6": b | s,
        "blockquote": b,
        "pre": b,
        "table": b,
        "dl": b,
        "ol": b,
        "ul": b,
        "form": b,
        "fieldset": b,
        "iframe": b,
        "script": b | i,
        "noscript": b | i,
        "math": b | i,
        "ins": b | i,
        "del": b | i,
        "img": b | i,
        "li": s,
        "dd": s,
        "dt": s,
        "td": s,
        "th": s,
        "legend": s,
        "address": s,
        "hr": b | n,
        "!": b | n,
        "head": b
    };
    delete b;
    delete i;
    delete n;



    /////////////////////////////////////////////////////////////////////////////
    // LinkDefinition

    function LinkDefinition(id, url, title) {
        this.id = id;
        this.url = url;
        if (title == undefined)
            this.title = null;
        else
            this.title = title;
    }

    p = LinkDefinition.prototype;
    p.RenderLink = function (m, b, link_text) {
        if (this.url.substr(0, 7).toLowerCase() == "mailto:") {
            b.Append("<a href=\"");
            b.HtmlRandomize(this.url);
            b.Append('\"');
            if (this.title) {
                b.Append(" title=\"");
                b.SmartHtmlEncodeAmpsAndAngles(this.title, 0, this.title.length);
                b.Append('\"');
            }
            b.Append('>');
            b.HtmlRandomize(link_text);
            b.Append("</a>");
        }
        else {
            var tag = new HtmlTag("a");

            // encode url
            var sb = m.GetStringBuilder();
            sb.SmartHtmlEncodeAmpsAndAngles(this.url, 0, this.url.length);
            tag.attributes["href"] = sb.ToString();

            // encode title
            if (this.title) {
                sb.Clear();
                sb.SmartHtmlEncodeAmpsAndAngles(this.title, 0, this.title.length);
                tag.attributes["title"] = sb.ToString();
            }

            // Do user processing
            m.OnPrepareLink(tag);

            // Render the opening tag
            tag.RenderOpening(b);

            b.Append(link_text);   // Link text already escaped by SpanFormatter
            b.Append("</a>");
        }
    }

    p.RenderImg = function (m, b, alt_text) {
        var tag = new HtmlTag("img");

        // encode url
        var sb = m.GetStringBuilder();
        sb.SmartHtmlEncodeAmpsAndAngles(this.url, 0, this.url.length);
        tag.attributes["src"] = sb.ToString();

        // encode alt text
        if (alt_text) {
            sb.Clear();
            sb.SmartHtmlEncodeAmpsAndAngles(alt_text, 0, alt_text.length);
            tag.attributes["alt"] = sb.ToString();
        }

        // encode title
        if (this.title) {
            sb.Clear();
            sb.SmartHtmlEncodeAmpsAndAngles(this.title, 0, this.title.length);
            tag.attributes["title"] = sb.ToString();
        }

        tag.closed = true;

        m.OnPrepareImage(tag, m.RenderingTitledImage);

        tag.RenderOpening(b);

        /*
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
        */
    }

    function ParseLinkDefinition(p, ExtraMode) {
        var savepos = p.m_position;
        var l = ParseLinkDefinitionInternal(p, ExtraMode);
        if (l == null)
            p.m_position = savepos;
        return l;
    }

    function ParseLinkDefinitionInternal(p, ExtraMode) {
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
        var link = ParseLinkTarget(p, id, ExtraMode);

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
    function ParseLinkTarget(p, id, ExtraMode) {
        // Skip whitespace
        p.SkipWhitespace();

        // End of string?
        if (p.eol())
            return null;

        // Create the link definition
        var r = new LinkDefinition(id);

        // Is the url enclosed in angle brackets
        if (p.SkipChar('<')) {
            // Extract the url
            p.Mark();

            // Find end of the url
            while (p.current() != '>') {
                if (p.eof())
                    return null;
                p.SkipEscapableChar(ExtraMode);
            }

            var url = p.Extract();
            if (!p.SkipChar('>'))
                return null;

            // Unescape it
            r.url = UnescapeString(Trim(url), ExtraMode);

            // Skip whitespace
            p.SkipWhitespace();
        }
        else {
            // Find end of the url
            p.Mark();
            var paren_depth = 1;
            while (!p.eol()) {
                var ch = p.current();
                if (is_whitespace(ch))
                    break;
                if (id == null) {
                    if (ch == '(')
                        paren_depth++;
                    else if (ch == ')') {
                        paren_depth--;
                        if (paren_depth == 0)
                            break;
                    }
                }

                p.SkipEscapableChar(ExtraMode);
            }

            r.url = UnescapeString(Trim(p.Extract()), ExtraMode);
        }

        p.SkipLinespace();

        // End of inline target
        if (p.current() == ')')
            return r;

        var bOnNewLine = p.eol();
        var posLineEnd = p.m_position;
        if (p.eol()) {
            p.SkipEol();
            p.SkipLinespace();
        }

        // Work out what the title is delimited with
        var delim;
        switch (p.current()) {
            case '\'':
            case '\"':
                delim = p.current();
                break;

            case '(':
                delim = ')';
                break;

            default:
                if (bOnNewLine) {
                    p.m_position = posLineEnd;
                    return r;
                }
                else
                    return null;
        }

        // Skip the opening title delimiter
        p.SkipForward(1);

        // Find the end of the title
        p.Mark();
        while (true) {
            if (p.eol())
                return null;

            if (p.current() == delim) {

                if (delim != ')') {
                    var savepos = p.m_position;

                    // Check for embedded quotes in title

                    // Skip the quote and any trailing whitespace
                    p.SkipForward(1);
                    p.SkipLinespace();

                    // Next we expect either the end of the line for a link definition
                    // or the close bracket for an inline link
                    if ((id == null && p.current() != ')') ||
					    (id != null && !p.eol())) {
                        continue;
                    }

                    p.m_position = savepos;
                }

                // End of title
                break;
            }

            p.SkipEscapableChar(ExtraMode);
        }

        // Store the title
        r.title = UnescapeString(p.Extract(), ExtraMode);

        // Skip closing quote
        p.SkipForward(1);

        // Done!
        return r;
    }


    /////////////////////////////////////////////////////////////////////////////
    // LinkInfo

    function LinkInfo(def, link_text) {
        this.def = def;
        this.link_text = link_text;
    }


    /////////////////////////////////////////////////////////////////////////////
    // Token

    var TokenType_Text = 0;
    var TokenType_HtmlTag = 1;
    var TokenType_Html = 2;
    var TokenType_open_em = 3;
    var TokenType_close_em = 4;
    var TokenType_open_strong = 5;
    var TokenType_close_strong = 6;
    var TokenType_code_span = 7;
    var TokenType_br = 8;
    var TokenType_link = 9;
    var TokenType_img = 10;
    var TokenType_opening_mark = 11;
    var TokenType_closing_mark = 12;
    var TokenType_internal_mark = 13;
    var TokenType_footnote = 14;
    var TokenType_abbreviation = 15;

    function Token(type, startOffset, length) {
        this.type = type;
        this.startOffset = startOffset;
        this.length = length;
        this.data = null;
    }

    /////////////////////////////////////////////////////////////////////////////
    // SpanFormatter

    function SpanFormatter(markdown) {
        this.m_Markdown = markdown;
        this.m_Scanner = new StringScanner();
        this.m_SpareTokens = [];
        this.m_DisableLinks = false;
        this.m_Tokens = [];
    }

    p = SpanFormatter.prototype;

    p.FormatParagraph = function (dest, str, start, len) {
        // Parse the string into a list of tokens
        this.Tokenize(str, start, len);

        // Titled image?
        if (this.m_Tokens.length == 1 && this.m_Markdown.HtmlClassTitledImages != null && this.m_Tokens[0].type == TokenType_img) {
            // Grab the link info
            var li = this.m_Tokens[0].data;

            // Render the div opening
            dest.Append("<div class=\"");
            dest.Append(this.m_Markdown.HtmlClassTitledImages);
            dest.Append("\">\n");

            // Render the img
            this.m_Markdown.RenderingTitledImage = true;
            this.Render(dest, str);
            this.m_Markdown.RenderingTitledImage = false;
            dest.Append("\n");

            // Render the title
            if (li.def.title) {
                dest.Append("<p>");
                dest.SmartHtmlEncodeAmpsAndAngles(li.def.title, 0, li.def.title.length);
                dest.Append("</p>\n");
            }

            dest.Append("</div>\n");
        }
        else {
            // Render the paragraph
            dest.Append("<p>");
            this.Render(dest, str);
            dest.Append("</p>\n");
        }

    }

    // Format part of a string into a destination string builder
    p.Format2 = function (dest, str) {
        this.Format(dest, str, 0, str.length);
    }

    // Format part of a string into a destination string builder
    p.Format = function (dest, str, start, len) {
        // Parse the string into a list of tokens
        this.Tokenize(str, start, len);

        // Render all tokens
        this.Render(dest, str);
    }

    // Format a string and return it as a new string
    // (used in formatting the text of links)
    p.FormatDirect = function (str) {
        var dest = new StringBuilder();
        this.Format(dest, str, 0, str.length);
        return dest.ToString();
    }

    p.MakeID = function (str, start, len) {
        // Parse the string into a list of tokens
        this.Tokenize(str, start, len);
        var tokens = this.m_Tokens;

        var sb = new StringBuilder();
        for (var i = 0; i < tokens.length; i++) {
            var t = tokens[i];
            switch (t.type) {
                case TokenType_Text:
                    sb.Append(str.substr(t.startOffset, t.length));
                    break;

                case TokenType_link:
                    sb.Append(t.data.link_text);
                    break;
            }
            this.FreeToken(t);
        }

        // Now clean it using the same rules as pandoc
        var p = this.m_Scanner;
        p.reset(sb.ToString());

        // Skip everything up to the first letter
        while (!p.eof()) {
            if (is_alpha(p.current()))
                break;
            p.SkipForward(1);
        }

        // Process all characters
        sb.Clear();
        while (!p.eof()) {
            var ch = p.current();
            if (is_alphadigit(ch) || ch == '_' || ch == '-' || ch == '.')
                sb.Append(ch.toLowerCase());
            else if (ch == ' ')
                sb.Append("-");
            else if (is_lineend(ch)) {
                sb.Append("-");
                p.SkipEol();
                continue;
            }

            p.SkipForward(1);
        }

        return sb.ToString();
    }



    // Render a list of tokens to a destination string builder.
    p.Render = function (sb, str) {
        var tokens = this.m_Tokens;
        var len = tokens.length;
        for (var i = 0; i < len; i++) {
            var t = tokens[i];
            switch (t.type) {
                case TokenType_Text:
                    // Append encoded text
                    sb.HtmlEncode(str, t.startOffset, t.length);
                    break;

                case TokenType_HtmlTag:
                    // Append html as is
                    sb.SmartHtmlEncodeAmps(str, t.startOffset, t.length);
                    break;

                case TokenType_Html:
                case TokenType_opening_mark:
                case TokenType_closing_mark:
                case TokenType_internal_mark:
                    // Append html as is
                    sb.Append(str.substr(t.startOffset, t.length));
                    break;

                case TokenType_br:
                    sb.Append("<br />\n");
                    break;

                case TokenType_open_em:
                    sb.Append("<em>");
                    break;

                case TokenType_close_em:
                    sb.Append("</em>");
                    break;

                case TokenType_open_strong:
                    sb.Append("<strong>");
                    break;

                case TokenType_close_strong:
                    sb.Append("</strong>");
                    break;

                case TokenType_code_span:
                    sb.Append("<code>");
                    sb.HtmlEncode(str, t.startOffset, t.length);
                    sb.Append("</code>");
                    break;

                case TokenType_link:
                    var li = t.data;
                    var sf = new SpanFormatter(this.m_Markdown);
                    sf.m_DisableLinks = true;

                    li.def.RenderLink(this.m_Markdown, sb, sf.FormatDirect(li.link_text));
                    break;

                case TokenType_img:
                    var li = t.data;
                    li.def.RenderImg(this.m_Markdown, sb, li.link_text);
                    break;

                case TokenType_footnote:
                    var r = t.data;
                    sb.Append("<sup id=\"fnref:");
                    sb.Append(r.id);
                    sb.Append("\"><a href=\"#fn:");
                    sb.Append(r.id);
                    sb.Append("\" rel=\"footnote\">");
                    sb.Append(r.index + 1);
                    sb.Append("</a></sup>");
                    break;

                case TokenType_abbreviation:
                    var a = t.data;
                    sb.Append("<abbr");
                    if (a.Title) {
                        sb.Append(" title=\"");
                        sb.HtmlEncode(a.Title, 0, a.Title.length);
                        sb.Append("\"");
                    }
                    sb.Append(">");
                    sb.HtmlEncode(a.Abbr, 0, a.Abbr.length);
                    sb.Append("</abbr>");
                    break;


            }

            this.FreeToken(t);
        }
    }

    p.Tokenize = function (str, start, len) {
        // Reset the string scanner
        var p = this.m_Scanner;
        p.reset(str, start, len);

        var tokens = this.m_Tokens;
        tokens.length = 0;

        var emphasis_marks = null;
        var Abbreviations = this.m_Markdown.GetAbbreviations();

        var re = Abbreviations == null ? /[\*\_\`\[\!\<\&\ \\]/g : null;

        var ExtraMode = this.m_Markdown.ExtraMode;

        // Scan string
        var start_text_token = p.m_position;
        while (!p.eof()) {
            if (re != null && !p.FindRE(re))
                break;

            var end_text_token = p.m_position;

            // Work out token
            var token = null;
            switch (p.current()) {
                case '*':
                case '_':

                    // Create emphasis mark
                    token = this.CreateEmphasisMark();

                    if (token != null) {
                        // Store marks in a separate list the we'll resolve later
                        switch (token.type) {
                            case TokenType_internal_mark:
                            case TokenType_opening_mark:
                            case TokenType_closing_mark:
                                if (emphasis_marks == null) {
                                    emphasis_marks = [];
                                }
                                emphasis_marks.push(token);
                                break;
                        }
                    }
                    break;

                case '`':
                    token = this.ProcessCodeSpan();
                    break;

                case '[':
                case '!':
                    // Process link reference
                    var linkpos = p.m_position;
                    token = this.ProcessLinkOrImageOrFootnote();

                    // Rewind if invalid syntax
                    // (the '[' or '!' will be treated as a regular character and processed below)
                    if (token == null)
                        p.m_position = linkpos;
                    break;

                case '<':
                    // Is it a valid html tag?
                    var save = p.m_position;
                    var tag = ParseHtmlTag(p);
                    if (tag != null) {
                        // Yes, create a token for it
                        if (!this.m_Markdown.SafeMode || tag.IsSafe()) {
                            // Yes, create a token for it
                            token = this.CreateToken(TokenType_HtmlTag, save, p.m_position - save);
                        }
                        else {
                            // No, rewrite and encode it
                            p.m_position = save;
                        }
                    }
                    else {
                        // No, rewind and check if it's a valid autolink eg: <google.com>
                        p.m_position = save;
                        token = this.ProcessAutoLink();

                        if (token == null)
                            p.m_position = save;
                    }
                    break;

                case '&':
                    // Is it a valid html entity
                    var save = p.m_position;
                    if (p.SkipHtmlEntity()) {
                        // Yes, create a token for it
                        token = this.CreateToken(TokenType_Html, save, p.m_position - save);
                    }

                    break;

                case ' ':
                    // Check for double space at end of a line
                    if (p.CharAtOffset(1) == ' ' && is_lineend(p.CharAtOffset(2))) {
                        // Yes, skip it
                        p.SkipForward(2);

                        // Don't put br's at the end of a paragraph
                        if (!p.eof()) {
                            p.SkipEol();
                            token = this.CreateToken(TokenType_br, end_text_token, 0);
                        }
                    }
                    break;

                case '\\':
                    // Check followed by an escapable character
                    if (is_escapable(p.CharAtOffset(1), ExtraMode)) {
                        token = this.CreateToken(TokenType_Text, p.m_position + 1, 1);
                        p.SkipForward(2);
                    }
                    break;
            }

            // Look for abbreviations.
            if (token == null && Abbreviations != null && !is_alphadigit(p.CharAtOffset(-1))) {
                var savepos = p.m_position;
                for (var i in Abbreviations) {
                    var abbr = Abbreviations[i];
                    if (p.SkipString(abbr.Abbr) && !is_alphadigit(p.current())) {
                        token = this.CreateDataToken(TokenType_abbreviation, abbr);
                        break;
                    }

                    p.position = savepos;
                }
            }


            // If token found, append any preceeding text and the new token to the token list
            if (token != null) {
                // Create a token for everything up to the special character
                if (end_text_token > start_text_token) {
                    tokens.push(this.CreateToken(TokenType_Text, start_text_token, end_text_token - start_text_token));
                }

                // Add the new token
                tokens.push(token);

                // Remember where the next text token starts
                start_text_token = p.m_position;
            }
            else {
                // Skip a single character and keep looking
                p.SkipForward(1);
            }
        }

        // Append a token for any trailing text after the last token.
        if (p.m_position > start_text_token) {
            tokens.push(this.CreateToken(TokenType_Text, start_text_token, p.m_position - start_text_token));
        }

        // Do we need to resolve and emphasis marks?
        if (emphasis_marks != null) {
            this.ResolveEmphasisMarks(tokens, emphasis_marks);
        }
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
    p.CreateEmphasisMark = function () {
        var p = this.m_Scanner;

        // Capture current state
        var ch = p.current();
        var altch = ch == '*' ? '_' : '*';
        var savepos = p.m_position;

        // Check for a consecutive sequence of just '_' and '*'
        if (p.bof() || is_whitespace(p.CharAtOffset(-1))) {
            while (is_emphasis(p.current()))
                p.SkipForward(1);

            if (p.eof() || is_whitespace(p.current())) {
                return this.CreateToken(TokenType_Html, savepos, p.m_position - savepos);
            }

            // Rewind
            p.m_position = savepos;
        }

        // Scan backwards and see if we have space before
        while (is_emphasis(p.CharAtOffset(-1)))
            p.SkipForward(-1);
        var bSpaceBefore = p.bof() || is_whitespace(p.CharAtOffset(-1));
        p.m_position = savepos;

        // Count how many matching emphasis characters
        while (p.current() == ch) {
            p.SkipForward(1);
        }
        var count = p.m_position - savepos;

        // Scan forwards and see if we have space after
        while (is_emphasis(p.CharAtOffset(1)))
            p.SkipForward(1);
        var bSpaceAfter = p.eof() || is_whitespace(p.current());
        p.m_position = savepos + count;

        if (bSpaceBefore) {
            return this.CreateToken(TokenType_opening_mark, savepos, p.m_position - savepos);
        }

        if (bSpaceAfter) {
            return this.CreateToken(TokenType_closing_mark, savepos, p.m_position - savepos);
        }

        if (this.m_Markdown.ExtraMode && ch == '_' && is_alphadigit(p.current()))
            return null;


        return this.CreateToken(TokenType_internal_mark, savepos, p.m_position - savepos);
    }

    // Split mark token
    p.SplitMarkToken = function (tokens, marks, token, position) {
        // Create the new rhs token
        var tokenRhs = this.CreateToken(token.type, token.startOffset + position, token.length - position);

        // Adjust down the length of this token
        token.length = position;

        // Insert the new token into each of the parent collections
        marks.splice(array_indexOf(marks, token) + 1, 0, tokenRhs);
        tokens.splice(array_indexOf(tokens, token) + 1, 0, tokenRhs);

        // Return the new token
        return tokenRhs;
    }

    // Resolve emphasis marks (part 2)
    p.ResolveEmphasisMarks = function (tokens, marks) {
        var input = this.m_Scanner.buf;

        var bContinue = true;
        while (bContinue) {
            bContinue = false;
            for (var i = 0; i < marks.length; i++) {
                // Get the next opening or internal mark
                var opening_mark = marks[i];
                if (opening_mark.type != TokenType_opening_mark && opening_mark.type != TokenType_internal_mark)
                    continue;

                // Look for a matching closing mark
                for (var j = i + 1; j < marks.length; j++) {
                    // Get the next closing or internal mark
                    var closing_mark = marks[j];
                    if (closing_mark.type != TokenType_closing_mark && closing_mark.type != TokenType_internal_mark)
                        break;

                    // Ignore if different type (ie: `*` vs `_`)
                    if (input.charAt(opening_mark.startOffset) != input.charAt(closing_mark.startOffset))
                        continue;

                    // strong or em?
                    var style = Math.min(opening_mark.length, closing_mark.length);

                    // Triple or more on both ends?
                    if (style >= 3) {
                        style = (style % 2) == 1 ? 1 : 2;
                    }

                    // Split the opening mark, keeping the RHS
                    if (opening_mark.length > style) {
                        opening_mark = this.SplitMarkToken(tokens, marks, opening_mark, opening_mark.length - style);
                        i--;
                    }

                    // Split the closing mark, keeping the LHS
                    if (closing_mark.length > style) {
                        this.SplitMarkToken(tokens, marks, closing_mark, style);
                    }

                    // Connect them
                    opening_mark.type = style == 1 ? TokenType_open_em : TokenType_open_strong;
                    closing_mark.type = style == 1 ? TokenType_close_em : TokenType_close_strong;

                    // Remove the matched marks
                    marks.splice(array_indexOf(marks, opening_mark), 1);
                    marks.splice(array_indexOf(marks, closing_mark), 1);
                    bContinue = true;

                    break;
                }
            }
        }
    }

    // Process auto links eg: <google.com>
    p.ProcessAutoLink = function () {
        if (this.m_DisableLinks)
            return null;

        var p = this.m_Scanner;

        // Skip the angle bracket and remember the start
        p.SkipForward(1);
        p.Mark();

        var ExtraMode = this.m_Markdown.ExtraMode;

        // Allow anything up to the closing angle, watch for escapable characters
        while (!p.eof()) {
            var ch = p.current();

            // No whitespace allowed
            if (is_whitespace(ch))
                break;

            // End found?
            if (ch == '>') {
                var url = UnescapeString(p.Extract(), ExtraMode);

                var li = null;
                if (IsEmailAddress(url)) {
                    var link_text;
                    if (url.toLowerCase().substr(0, 7) == "mailto:") {
                        link_text = url.substr(7);
                    }
                    else {
                        link_text = url;
                        url = "mailto:" + url;
                    }

                    li = new LinkInfo(new LinkDefinition("auto", url, null), link_text);
                }
                else if (IsWebAddress(url)) {
                    li = new LinkInfo(new LinkDefinition("auto", url, null), url);
                }

                if (li != null) {
                    p.SkipForward(1);
                    return this.CreateDataToken(TokenType_link, li);
                }

                return null;
            }

            p.SkipEscapableChar(ExtraMode);
        }

        // Didn't work
        return null;
    }

    // Process [link] and ![image] directives
    p.ProcessLinkOrImageOrFootnote = function () {
        var p = this.m_Scanner;

        // Link or image?
        var token_type = p.SkipChar('!') ? TokenType_img : TokenType_link;

        // Opening '['
        if (!p.SkipChar('['))
            return null;

        // Is it a foonote?
        var savepos = this.m_position;
        if (this.m_Markdown.ExtraMode && token_type == TokenType_link && p.SkipChar('^')) {
            p.SkipLinespace();

            // Parse it
            p.Mark();
            var id = p.SkipFootnoteID();
            if (id != null && p.SkipChar(']')) {
                // Look it up and create footnote reference token
                var footnote_index = this.m_Markdown.ClaimFootnote(id);
                if (footnote_index >= 0) {
                    // Yes it's a footnote
                    return this.CreateDataToken(TokenType_footnote, { index: footnote_index, id: id });
                }
            }

            // Rewind
            this.m_position = savepos;
        }

        if (this.m_DisableLinks && token_type == TokenType_link)
            return null;

        var ExtraMode = this.m_Markdown.ExtraMode;

        // Find the closing square bracket, allowing for nesting, watching for 
        // escapable characters
        p.Mark();
        var depth = 1;
        while (!p.eof()) {
            var ch = p.current();
            if (ch == '[') {
                depth++;
            }
            else if (ch == ']') {
                depth--;
                if (depth == 0)
                    break;
            }

            p.SkipEscapableChar(ExtraMode);
        }

        // Quit if end
        if (p.eof())
            return null;

        // Get the link text and unescape it
        var link_text = UnescapeString(p.Extract(), ExtraMode);

        // The closing ']'
        p.SkipForward(1);

        // Save position in case we need to rewind
        savepos = p.m_position;

        // Inline links must follow immediately
        if (p.SkipChar('(')) {
            // Extract the url and title
            var link_def = ParseLinkTarget(p, null, this.m_Markdown.ExtraMode);
            if (link_def == null)
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
        if (p.eol()) {
            p.SkipEol();
            p.SkipLinespace();
        }

        // Reference link?
        var link_id = null;
        if (p.current() == '[') {
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
        else {
            // Rewind to just after the closing ']'
            p.m_position = savepos;
        }

        // Link id not specified?
        if (!link_id) {
            link_id = link_text;

            // Convert all whitespace+line end to a single space
            while (true) {
                // Find carriage return
                var i = link_id.indexOf("\n");
                if (i < 0)
                    break;

                var start = i;
                while (start > 0 && is_whitespace(link_id.charAt(start - 1)))
                    start--;

                var end = i;
                while (end < link_id.length && is_whitespace(link_id.charAt(end)))
                    end++;

                link_id = link_id.substr(0, start) + " " + link_id.substr(end);
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
    p.ProcessCodeSpan = function () {
        var p = this.m_Scanner;
        var start = p.m_position;

        // Count leading ticks
        var tickcount = 0;
        while (p.SkipChar('`')) {
            tickcount++;
        }

        // Skip optional leading space...
        p.SkipWhitespace();

        // End?
        if (p.eof())
            return this.CreateToken(TokenType_Text, start, p.m_position - start);

        var startofcode = p.m_position;

        // Find closing ticks
        if (!p.Find(p.buf.substr(start, tickcount)))
            return this.CreateToken(TokenType_Text, start, p.m_position - start);

        // Save end position before backing up over trailing whitespace
        var endpos = p.m_position + tickcount;
        while (is_whitespace(p.CharAtOffset(-1)))
            p.SkipForward(-1);

        // Create the token, move back to the end and we're done
        var ret = this.CreateToken(TokenType_code_span, startofcode, p.m_position - startofcode);
        p.m_position = endpos;
        return ret;
    }

    p.CreateToken = function (type, startOffset, length) {
        if (this.m_SpareTokens.length != 0) {
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
    p.CreateDataToken = function (type, data) {
        if (this.m_SpareTokens.length != 0) {
            var t = this.m_SpareTokens.pop();
            t.type = type;
            t.data = data;
            return t;
        }
        else {
            var t = new Token(type, 0, 0);
            t.data = data;
            return t;
        }
    }

    // FreeToken - return a token to the spare token pool
    p.FreeToken = function (token) {
        token.data = null;
        this.m_SpareTokens.push(token);
    }



    /////////////////////////////////////////////////////////////////////////////
    // Block

    var BlockType_Blank = 0;
    var BlockType_h1 = 1;
    var BlockType_h2 = 2;
    var BlockType_h3 = 3;
    var BlockType_h4 = 4;
    var BlockType_h5 = 5;
    var BlockType_h6 = 6;
    var BlockType_post_h1 = 7;
    var BlockType_post_h2 = 8;
    var BlockType_quote = 9;
    var BlockType_ol_li = 10;
    var BlockType_ul_li = 11;
    var BlockType_p = 12;
    var BlockType_indent = 13;
    var BlockType_hr = 14;
    var BlockType_user_break = 15;
    var BlockType_html = 16;
    var BlockType_unsafe_html = 17;
    var BlockType_span = 18;
    var BlockType_codeblock = 19;
    var BlockType_li = 20;
    var BlockType_ol = 21;
    var BlockType_ul = 22;
    var BlockType_HtmlTag = 23;
    var BlockType_Composite = 24;
    var BlockType_table_spec = 25;
    var BlockType_dd = 26;
    var BlockType_dt = 27;
    var BlockType_dl = 28;
    var BlockType_footnote = 29;
    var BlockType_p_footnote = 30;


    function Block() {
    }


    p = Block.prototype;
    p.buf = null;
    p.blockType = BlockType_Blank;
    p.contentStart = 0;
    p.contentLen = 0;
    p.lineStart = 0;
    p.lineLen = 0;
    p.children = null;
    p.data = null;

    p.get_Content = function () {
        if (this.buf == null)
            return null;
        if (this.contentStart == -1)
            return this.buf;

        return this.buf.substr(this.contentStart, this.contentLen);
    }


    p.get_CodeContent = function () {
        var s = new StringBuilder();
        for (var i = 0; i < this.children.length; i++) {
            s.Append(this.children[i].get_Content());
            s.Append('\n');
        }
        return s.ToString();
    }


    p.RenderChildren = function (m, b) {
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].Render(m, b);
        }
    }

    p.ResolveHeaderID = function (m) {
        // Already resolved?
        if (typeof (this.data) == 'string')
            return this.data;

        // Approach 1 - PHP Markdown Extra style header id
        var res = StripHtmlID(this.buf, this.contentStart, this.get_contentEnd());
        var id = null;
        if (res != null) {
            this.set_contentEnd(res.end);
            id = res.id;
        }
        else {
            // Approach 2 - pandoc style header id
            id = m.MakeUniqueHeaderID(this.buf, this.contentStart, this.contentLen);
        }

        this.data = id;
        return id;
    }

    p.Render = function (m, b) {
        switch (this.blockType) {
            case BlockType_Blank:
                return;

            case BlockType_p:
                m.m_SpanFormatter.FormatParagraph(b, this.buf, this.contentStart, this.contentLen);
                break;

            case BlockType_span:
                m.m_SpanFormatter.Format(b, this.buf, this.contentStart, this.contentLen);
                b.Append("\n");
                break;

            case BlockType_h1:
            case BlockType_h2:
            case BlockType_h3:
            case BlockType_h4:
            case BlockType_h5:
            case BlockType_h6:
                if (m.ExtraMode && !m.SafeMode) {
                    b.Append("<h" + (this.blockType - BlockType_h1 + 1).toString());
                    var id = this.ResolveHeaderID(m);
                    if (id) {
                        b.Append(" id=\"");
                        b.Append(id);
                        b.Append("\">");
                    }
                    else {
                        b.Append(">");
                    }
                }
                else {
                    b.Append("<h" + (this.blockType - BlockType_h1 + 1).toString() + ">");
                }
                m.m_SpanFormatter.Format(b, this.buf, this.contentStart, this.contentLen);
                b.Append("</h" + (this.blockType - BlockType_h1 + 1).toString() + ">\n");
                break;

            case BlockType_hr:
                b.Append("<hr />\n");
                return;

            case BlockType_user_break:
                return;

            case BlockType_ol_li:
            case BlockType_ul_li:
                b.Append("<li>");
                m.m_SpanFormatter.Format(b, this.buf, this.contentStart, this.contentLen);
                b.Append("</li>\n");
                break;

            case BlockType_html:
                b.Append(this.buf.substr(this.contentStart, this.contentLen));
                return;

            case BlockType_unsafe_html:
                b.HtmlEncode(this.buf, this.contentStart, this.contentLen);
                return;

            case BlockType_codeblock:
                // Build the code section
                var btemp = b;
                b = new StringBuilder();

                for (var i = 0; i < this.children.length; i++) {
                    var line = this.children[i];
                    if (m.DontEncodeCodeBlocks)
                        b.Append(line.buf.substr(line.contentStart, line.contentLen));
                    else
                        b.HtmlEncodeAndConvertTabsToSpaces(line.buf, line.contentStart, line.contentLen);
                    b.Append("\n");
                }

                var code = b.ToString();
                b = btemp;


                b.Append("<pre");
                if (m.FormatCodeBlockAttributes != null) {
                    b.Append(m.FormatCodeBlockAttributes({
                        code: code, 
                        language: this.language
                    }));
                }
                b.Append("><code>");


                if (m.FormatCodeBlock) {
                    b.Append(m.FormatCodeBlock(code, this.data, this.language));
                }
                else { 
                    b.Append(code);
                }

                b.Append("</code></pre>\n\n");
                return;

            case BlockType_quote:
                b.Append("<blockquote>\n");
                this.RenderChildren(m, b);
                b.Append("</blockquote>\n");
                return;

            case BlockType_li:
                b.Append("<li>\n");
                this.RenderChildren(m, b);
                b.Append("</li>\n");
                return;

            case BlockType_ol:
                b.Append("<ol>\n");
                this.RenderChildren(m, b);
                b.Append("</ol>\n");
                return;

            case BlockType_ul:
                b.Append("<ul>\n");
                this.RenderChildren(m, b);
                b.Append("</ul>\n");
                return;

            case BlockType_HtmlTag:
                var tag = this.data;

                // Prepare special tags
                var name = tag.name.toLowerCase();
                if (name == "a") {
                    m.OnPrepareLink(tag);
                }
                else if (name == "img") {
                    m.OnPrepareImage(tag, m.RenderingTitledImage);
                }

                tag.RenderOpening(b);
                b.Append("\n");
                this.RenderChildren(m, b);
                tag.RenderClosing(b);
                b.Append("\n");
                return;

            case BlockType_Composite:
            case BlockType_footnote:
                this.RenderChildren(m, b);
                return;

            case BlockType_table_spec:
                this.data.Render(m, b);
                return;

            case BlockType_dd:
                b.Append("<dd>");
                if (this.children != null) {
                    b.Append("\n");
                    this.RenderChildren(m, b);
                }
                else
                    m.m_SpanFormatter.Format(b, this.buf, this.contentStart, this.contentLen);
                b.Append("</dd>\n");
                break;

            case BlockType_dt:
                if (this.children == null) {
                    var lines = this.get_Content().split("\n");
                    for (var i = 0; i < lines.length; i++) {
                        var l = lines[i];
                        b.Append("<dt>");
                        m.m_SpanFormatter.Format2(b, Trim(l));
                        b.Append("</dt>\n");
                    }
                }
                else {
                    b.Append("<dt>\n");
                    this.RenderChildren(m, b);
                    b.Append("</dt>\n");
                }
                break;

            case BlockType_dl:
                b.Append("<dl>\n");
                this.RenderChildren(m, b);
                b.Append("</dl>\n");
                return;

            case BlockType_p_footnote:
                b.Append("<p>");
                if (this.contentLen > 0) {
                    m.m_SpanFormatter.Format(b, this.buf, this.contentStart, this.contentLen);
                    b.Append("&nbsp;");
                }
                b.Append(this.data);
                b.Append("</p>\n");
                break;

        }
    }

    p.RevertToPlain = function () {
        this.blockType = BlockType_p;
        this.contentStart = this.lineStart;
        this.contentLen = this.lineLen;
    }

    p.get_contentEnd = function () {
        return this.contentStart + this.contentLen;
    }

    p.set_contentEnd = function (value) {
        this.contentLen = value - this.contentStart;
    }

    // Count the leading spaces on a block
    // Used by list item evaluation to determine indent levels
    // irrespective of indent line type.
    p.get_leadingSpaces = function () {
        var count = 0;
        for (var i = this.lineStart; i < this.lineStart + this.lineLen; i++) {
            if (this.buf.charAt(i) == ' ') {
                count++;
            }
            else {
                break;
            }
        }
        return count;
    }

    p.CopyFrom = function (other) {
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


    function BlockProcessor(m, MarkdownInHtml) {
        this.m_Markdown = m;
        this.m_parentType = BlockType_Blank;
        this.m_bMarkdownInHtml = MarkdownInHtml;
    }

    p = BlockProcessor.prototype;

    p.Process = function (str) {
        // Reset string scanner
        var p = new StringScanner(str);

        return this.ScanLines(p);
    }

    p.ProcessRange = function (str, startOffset, len) {
        // Reset string scanner
        var p = new StringScanner(str, startOffset, len);

        return this.ScanLines(p);
    }

    p.StartTable = function (p, spec, lines) {
        // Mustn't have more than 1 preceeding line
        if (lines.length > 1)
            return false;

        // Rewind, parse the header row then fast forward back to current pos
        if (lines.length == 1) {
            var savepos = p.m_position;
            p.m_position = lines[0].lineStart;
            spec.m_Headers = spec.ParseRow(p);
            if (spec.m_Headers == null)
                return false;
            p.m_position = savepos;
            lines.length = 0;
        }

        // Parse all .m_Rows
        while (true) {
            var savepos = p.m_position;

            var row = spec.ParseRow(p);
            if (row != null) {
                spec.m_Rows.push(row);
                continue;
            }

            p.m_position = savepos;
            break;
        }

        return true;
    }



    p.ScanLines = function (p) {
        // The final set of blocks will be collected here
        var blocks = [];

        // The current paragraph/list/codeblock etc will be accumulated here
        // before being collapsed into a block and store in above `blocks` list
        var lines = [];

        // Add all blocks
        var PrevBlockType = -1;
        while (!p.eof()) {
            // Remember if the previous line was blank
            var bPreviousBlank = PrevBlockType == BlockType_Blank;

            // Get the next block
            var b = this.EvaluateLine(p);
            PrevBlockType = b.blockType;

            // For dd blocks, we need to know if it was preceeded by a blank line
            // so store that fact as the block's data.
            if (b.blockType == BlockType_dd) {
                b.data = bPreviousBlank;
            }


            // SetExt header?
            if (b.blockType == BlockType_post_h1 || b.blockType == BlockType_post_h2) {
                if (lines.length > 0) {
                    // Remove the previous line and collapse the current paragraph
                    var prevline = lines.pop();
                    this.CollapseLines(blocks, lines);

                    // If previous line was blank, 
                    if (prevline.blockType != BlockType_Blank) {
                        // Convert the previous line to a heading and add to block list
                        prevline.RevertToPlain();
                        prevline.blockType = b.blockType == BlockType_post_h1 ? BlockType_h1 : BlockType_h2;
                        blocks.push(prevline);
                        continue;
                    }
                }


                // Couldn't apply setext header to a previous line

                if (b.blockType == BlockType_post_h1) {
                    // `===` gets converted to normal paragraph
                    b.RevertToPlain();
                    lines.push(b);
                }
                else {
                    // `---` gets converted to hr
                    if (b.contentLen >= 3) {
                        b.blockType = BlockType_hr;
                        blocks.push(b);
                    }
                    else {
                        b.RevertToPlain();
                        lines.push(b);
                    }
                }

                continue;
            }


            // Work out the current paragraph type
            var currentBlockType = lines.length > 0 ? lines[0].blockType : BlockType_Blank;

            // Starting a table?
            if (b.blockType == BlockType_table_spec) {
                // Get the table spec, save position
                var spec = b.data;
                var savepos = p.m_position;
                if (!this.StartTable(p, spec, lines)) {
                    // Not a table, revert the tablespec row to plain,
                    // fast forward back to where we were up to and continue
                    // on as if nothing happened
                    p.m_position = savepos;
                    b.RevertToPlain();
                }
                else {
                    blocks.push(b);
                    continue;
                }
            }

            // Process this line
            switch (b.blockType) {
                case BlockType_Blank:
                    switch (currentBlockType) {
                        case BlockType_Blank:
                            this.FreeBlock(b);
                            break;

                        case BlockType_p:
                            this.CollapseLines(blocks, lines);
                            this.FreeBlock(b);
                            break;

                        case BlockType_quote:
                        case BlockType_ol_li:
                        case BlockType_ul_li:
                        case BlockType_dd:
                        case BlockType_footnote:
                        case BlockType_indent:
                            lines.push(b);
                            break;
                    }
                    break;

                case BlockType_p:
                    switch (currentBlockType) {
                        case BlockType_Blank:
                        case BlockType_p:
                            lines.push(b);
                            break;

                        case BlockType_quote:
                        case BlockType_ol_li:
                        case BlockType_ul_li:
                        case BlockType_dd:
                        case BlockType_footnote:
                            var prevline = lines[lines.length - 1];
                            if (prevline.blockType == BlockType_Blank) {
                                this.CollapseLines(blocks, lines);
                                lines.push(b);
                            }
                            else {
                                lines.push(b);
                            }
                            break;

                        case BlockType_indent:
                            this.CollapseLines(blocks, lines);
                            lines.push(b);
                            break;
                    }
                    break;

                case BlockType_indent:
                    switch (currentBlockType) {
                        case BlockType_Blank:
                            // Start a code block
                            lines.push(b);
                            break;

                        case BlockType_p:
                        case BlockType_quote:
                            var prevline = lines[lines.length - 1];
                            if (prevline.blockType == BlockType_Blank) {
                                // Start a code block after a paragraph
                                this.CollapseLines(blocks, lines);
                                lines.push(b);
                            }
                            else {
                                // indented line in paragraph, just continue it
                                b.RevertToPlain();
                                lines.push(b);
                            }
                            break;


                        case BlockType_ol_li:
                        case BlockType_ul_li:
                        case BlockType_indent:
                        case BlockType_dd:
                        case BlockType_footnote:
                            lines.push(b);
                            break;
                    }
                    break;

                case BlockType_quote:
                    if (currentBlockType != BlockType_quote) {
                        this.CollapseLines(blocks, lines);
                    }
                    lines.push(b);
                    break;

                case BlockType_ol_li:
                case BlockType_ul_li:
                    switch (currentBlockType) {
                        case BlockType_Blank:
                            lines.push(b);
                            break;

                        case BlockType_p:
                        case BlockType_quote:
                            var prevline = lines[lines.length - 1];
                            if (prevline.blockType == BlockType_Blank || this.m_parentType == BlockType_ol_li || this.m_parentType == BlockType_ul_li || this.m_parentType == BlockType_dd) {
                                // List starting after blank line after paragraph or quote
                                this.CollapseLines(blocks, lines);
                                lines.push(b);
                            }
                            else {
                                // List's can't start in middle of a paragraph
                                b.RevertToPlain();
                                lines.push(b);
                            }
                            break;

                        case BlockType_ol_li:
                        case BlockType_ul_li:
                            if (b.blockType != BlockType_ol_li && b.blockType != BlockType_ul_li) {
                                this.CollapseLines(blocks, lines);
                            }
                            lines.push(b);
                            break;
                        case BlockType_dd:
                        case BlockType_footnote:
                            if (b.blockType != currentBlockType) {
                                this.CollapseLines(blocks, lines);
                            }
                            lines.push(b);
                            break;

                        case BlockType_indent:
                            // List after code block
                            this.CollapseLines(blocks, lines);
                            lines.push(b);
                            break;
                    }
                    break;

                case BlockType_dd:
                case BlockType_footnote:
                    switch (currentBlockType) {
                        case BlockType_Blank:
                        case BlockType_p:
                        case BlockType_dd:
                        case BlockType_footnote:
                            this.CollapseLines(blocks, lines);
                            lines.push(b);
                            break;

                        default:
                            b.RevertToPlain();
                            lines.push(b);
                            break;
                    }
                    break;

                default:
                    this.CollapseLines(blocks, lines);
                    blocks.push(b);
                    break;
            }
        }

        this.CollapseLines(blocks, lines);

        if (this.m_Markdown.ExtraMode) {
            this.BuildDefinitionLists(blocks);
        }

        return blocks;
    }

    p.CreateBlock = function (lineStart) {
        var b;
        if (this.m_Markdown.m_SpareBlocks.length > 1) {
            b = this.m_Markdown.m_SpareBlocks.pop();
        }
        else {
            b = new Block();
        }
        b.lineStart = lineStart;
        return b;
    }

    p.FreeBlock = function (b) {
        this.m_Markdown.m_SpareBlocks.push(b);
    }

    p.FreeBlocks = function (blocks) {
        for (var i = 0; i < blocks.length; i++)
            this.m_Markdown.m_SpareBlocks.push(blocks[i]);
        blocks.length = 0;
    }

    p.RenderLines = function (lines) {
        var b = this.m_Markdown.GetStringBuilder();
        for (var i = 0; i < lines.length; i++) {
            var l = lines[i];
            b.Append(l.buf.substr(l.contentStart, l.contentLen));
            b.Append('\n');
        }
        return b.ToString();
    }

    p.CollapseLines = function (blocks, lines) {
        // Remove trailing blank lines
        while (lines.length > 0 && lines[lines.length - 1].blockType == BlockType_Blank) {
            this.FreeBlock(lines.pop());
        }

        // Quit if empty
        if (lines.length == 0) {
            return;
        }


        // What sort of block?
        switch (lines[0].blockType) {
            case BlockType_p:
                // Collapse all lines into a single paragraph
                var para = this.CreateBlock(lines[0].lineStart);
                para.blockType = BlockType_p;
                para.buf = lines[0].buf;
                para.contentStart = lines[0].contentStart;
                para.set_contentEnd(lines[lines.length - 1].get_contentEnd());
                blocks.push(para);
                this.FreeBlocks(lines);
                break;

            case BlockType_quote:
                // Get the content
                var str = this.RenderLines(lines);

                // Create the new block processor
                var bp = new BlockProcessor(this.m_Markdown, this.m_bMarkdownInHtml);
                bp.m_parentType = BlockType_quote;

                // Create a new quote block
                var quote = this.CreateBlock(lines[0].lineStart);
                quote.blockType = BlockType_quote;
                quote.children = bp.Process(str);
                this.FreeBlocks(lines);
                blocks.push(quote);
                break;

            case BlockType_ol_li:
            case BlockType_ul_li:
                blocks.push(this.BuildList(lines));
                break;

            case BlockType_dd:
                if (blocks.length > 0) {
                    var prev = blocks[blocks.length - 1];
                    switch (prev.blockType) {
                        case BlockType_p:
                            prev.blockType = BlockType_dt;
                            break;

                        case BlockType_dd:
                            break;

                        default:
                            var wrapper = this.CreateBlock(prev.lineStart);
                            wrapper.blockType = BlockType_dt;
                            wrapper.children = [];
                            wrapper.children.push(prev);
                            blocks.pop();
                            blocks.push(wrapper);
                            break;
                    }

                }
                blocks.push(this.BuildDefinition(lines));
                break;

            case BlockType_footnote:
                this.m_Markdown.AddFootnote(this.BuildFootnote(lines));
                break;


            case BlockType_indent:
                var codeblock = this.CreateBlock(lines[0].lineStart);
                codeblock.blockType = BlockType_codeblock;
                codeblock.children = [];
                var firstline = lines[0].get_Content();
                if (firstline.substr(0, 2) == "{{" && firstline.substr(firstline.length - 2, 2) == "}}") {
                    codeblock.data = firstline.substr(2, firstline.length - 4);
                    lines.splice(0, 1);
                }
                for (var i = 0; i < lines.length; i++) {
                    codeblock.children.push(lines[i]);
                }
                blocks.push(codeblock);
                lines.length = 0;
                break;
        }
    }

    p.EvaluateLine = function (p) {
        // Create a block
        var b = this.CreateBlock(p.m_position);

        // Store line start
        b.buf = p.buf;

        // Scan the line
        b.contentStart = p.m_position;
        b.contentLen = -1;
        b.blockType = this.EvaluateLineInternal(p, b);


        // If end of line not returned, do it automatically
        if (b.contentLen < 0) {
            // Move to end of line
            p.SkipToEol();
            b.contentLen = p.m_position - b.contentStart;
        }

        // Setup line length
        b.lineLen = p.m_position - b.lineStart;

        // Next line
        p.SkipEol();

        // Create block
        return b;
    }

    p.EvaluateLineInternal = function (p, b) {
        // Empty line?
        if (p.eol())
            return BlockType_Blank;

        // Save start of line position
        var line_start = p.m_position;

        // ## Heading ##		
        var ch = p.current();
        if (ch == '#') {
            // Work out heading level
            var level = 1;
            p.SkipForward(1);
            while (p.current() == '#') {
                level++;
                p.SkipForward(1);
            }

            // Limit of 6
            if (level > 6)
                level = 6;

            // Skip any whitespace
            p.SkipLinespace();

            // Save start position
            b.contentStart = p.m_position;

            // Jump to end
            p.SkipToEol();

            // In extra mode, check for a trailing HTML ID
            if (this.m_Markdown.ExtraMode && !this.m_Markdown.SafeMode) {
                var res = StripHtmlID(p.buf, b.contentStart, p.m_position);
                if (res != null) {
                    b.data = res.id;
                    p.m_position = res.end;
                }
            }

            // Rewind over trailing hashes
            while (p.m_position > b.contentStart && p.CharAtOffset(-1) == '#') {
                p.SkipForward(-1);
            }

            // Rewind over trailing spaces
            while (p.m_position > b.contentStart && is_whitespace(p.CharAtOffset(-1))) {
                p.SkipForward(-1);
            }

            // Create the heading block
            b.contentLen = p.m_position - b.contentStart;

            p.SkipToEol();
            return BlockType_h1 + (level - 1);
        }

        // Check for entire line as - or = for setext h1 and h2
        if (ch == '-' || ch == '=') {
            // Skip all matching characters
            var chType = ch;
            while (p.current() == chType) {
                p.SkipForward(1);
            }

            // Trailing whitespace allowed
            p.SkipLinespace();

            // If not at eol, must have found something other than setext header
            if (p.eol()) {
                return chType == '=' ? BlockType_post_h1 : BlockType_post_h2;
            }

            p.m_position = line_start;
        }

        if (this.m_Markdown.ExtraMode) {
            // MarkdownExtra Table row indicator?
            var spec = TableSpec_Parse(p);
            if (spec != null) {
                b.data = spec;
                return BlockType_table_spec;
            }

            p.m_position = line_start;


            // Fenced code blocks?
            if (ch == '~' || ch == '`') {
                if (this.ProcessFencedCodeBlock(p, b))
                    return b.blockType;

                // Rewind
                p.m_position = line_start;
            }
        }

        // Scan the leading whitespace, remembering how many spaces and where the first tab is
        var tabPos = -1;
        var leadingSpaces = 0;
        while (!p.eol()) {
            if (p.current() == ' ') {
                if (tabPos < 0)
                    leadingSpaces++;
            }
            else if (p.current() == '\t') {
                if (tabPos < 0)
                    tabPos = p.m_position;
            }
            else {
                // Something else, get out
                break;
            }
            p.SkipForward(1);
        }

        // Blank line?
        if (p.eol()) {
            b.contentLen = 0;
            return BlockType_Blank;
        }

        // 4 leading spaces?
        if (leadingSpaces >= 4) {
            b.contentStart = line_start + 4;
            return BlockType_indent;
        }

        // Tab in the first 4 characters?
        if (tabPos >= 0 && tabPos - line_start < 4) {
            b.contentStart = tabPos + 1;
            return BlockType_indent;
        }

        // Treat start of line as after leading whitespace
        b.contentStart = p.m_position;

        // Get the next character
        ch = p.current();

        // Html block?
        if (ch == '<') {
            if (this.ScanHtml(p, b))
                return b.blockType;

            // Rewind
            p.m_position = b.contentStart;
        }

        // Block quotes start with '>' and have one space or one tab following
        if (ch == '>') {
            // Block quote followed by space
            if (is_linespace(p.CharAtOffset(1))) {
                // Skip it and create quote block
                p.SkipForward(2);
                b.contentStart = p.m_position;
                return BlockType_quote;
            }

            p.SkipForward(1);
            b.contentStart = p.m_position;
            return BlockType_quote;
        }

        // Horizontal rule - a line consisting of 3 or more '-', '_' or '*' with optional spaces and nothing else
        if (ch == '-' || ch == '_' || ch == '*') {
            var count = 0;
            while (!p.eol()) {
                var chType = p.current();
                if (p.current() == ch) {
                    count++;
                    p.SkipForward(1);
                    continue;
                }

                if (is_linespace(p.current())) {
                    p.SkipForward(1);
                    continue;
                }

                break;
            }

            if (p.eol() && count >= 3) {
                if (this.m_Markdown.UserBreaks)
                    return BlockType_user_break;
                else
                    return BlockType_hr;
            }

            // Rewind
            p.m_position = b.contentStart;
        }

        // Abbreviation definition?
        if (this.m_Markdown.ExtraMode && ch == '*' && p.CharAtOffset(1) == '[') {
            p.SkipForward(2);
            p.SkipLinespace();

            p.Mark();
            while (!p.eol() && p.current() != ']') {
                p.SkipForward(1);
            }

            var abbr = Trim(p.Extract());
            if (p.current() == ']' && p.CharAtOffset(1) == ':' && abbr) {
                p.SkipForward(2);
                p.SkipLinespace();

                p.Mark();

                p.SkipToEol();

                var title = p.Extract();

                this.m_Markdown.AddAbbreviation(abbr, title);

                return BlockType_Blank;
            }

            p.m_position = b.contentStart;
        }


        // Unordered list
        if ((ch == '*' || ch == '+' || ch == '-') && is_linespace(p.CharAtOffset(1))) {
            // Skip it
            p.SkipForward(1);
            p.SkipLinespace();
            b.contentStart = p.m_position;
            return BlockType_ul_li;
        }

        // Definition
        if (ch == ':' && this.m_Markdown.ExtraMode && is_linespace(p.CharAtOffset(1))) {
            p.SkipForward(1);
            p.SkipLinespace();
            b.contentStart = p.m_position;
            return BlockType_dd;
        }

        // Ordered list
        if (is_digit(ch)) {
            // Ordered list?  A line starting with one or more digits, followed by a '.' and a space or tab

            // Skip all digits
            p.SkipForward(1);
            while (is_digit(p.current()))
                p.SkipForward(1);

            if (p.SkipChar('.') && p.SkipLinespace()) {
                b.contentStart = p.m_position;
                return BlockType_ol_li;
            }

            p.m_position = b.contentStart;
        }

        // Reference link definition?
        if (ch == '[') {
            // Footnote definition?
            if (this.m_Markdown.ExtraMode && p.CharAtOffset(1) == '^') {
                var savepos = p.m_position;

                p.SkipForward(2);

                var id = p.SkipFootnoteID();
                if (id != null && p.SkipChar(']') && p.SkipChar(':')) {
                    p.SkipLinespace();
                    b.contentStart = p.m_position;
                    b.data = id;
                    return BlockType_footnote;
                }

                p.m_position = savepos;
            }

            // Parse a link definition
            var l = ParseLinkDefinition(p, this.m_Markdown.ExtraMode);
            if (l != null) {
                this.m_Markdown.AddLinkDefinition(l);
                return BlockType_Blank;
            }
        }

        // Nothing special
        return BlockType_p;
    }

    var MarkdownInHtmlMode_NA = 0;
    var MarkdownInHtmlMode_Block = 1;
    var MarkdownInHtmlMode_Span = 2;
    var MarkdownInHtmlMode_Deep = 3;
    var MarkdownInHtmlMode_Off = 4;

    p.GetMarkdownMode = function (tag) {
        // Get the markdown attribute
        var md = tag.attributes["markdown"];
        if (md == undefined) {
            if (this.m_bMarkdownInHtml)
                return MarkdownInHtmlMode_Deep;
            else
                return MarkdownInHtmlMode_NA;
        }

        // Remove it
        delete tag.attributes["markdown"];

        // Parse mode
        if (md == "1")
            return (tag.get_Flags() & HtmlTagFlags_ContentAsSpan) != 0 ? MarkdownInHtmlMode_Span : MarkdownInHtmlMode_Block;

        if (md == "block")
            return MarkdownInHtmlMode_Block;

        if (md == "deep")
            return MarkdownInHtmlMode_Deep;

        if (md == "span")
            return MarkdownInHtmlMode_Span;

        return MarkdownInHtmlMode_Off;
    }

    p.ProcessMarkdownEnabledHtml = function (p, b, openingTag, mode) {
        // Current position is just after the opening tag

        // Scan until we find matching closing tag
        var inner_pos = p.m_position;
        var depth = 1;
        var bHasUnsafeContent = false;
        while (!p.eof()) {
            // Find next angle bracket
            if (!p.Find('<'))
                break;

            // Is it a html tag?
            var tagpos = p.m_position;
            var tag = ParseHtmlTag(p);
            if (tag == null) {
                // Nope, skip it 
                p.SkipForward(1);
                continue;
            }

            // In markdown off mode, we need to check for unsafe tags
            if (this.m_Markdown.SafeMode && mode == MarkdownInHtmlMode_Off && !bHasUnsafeContent) {
                if (!tag.IsSafe())
                    bHasUnsafeContent = true;
            }

            // Ignore self closing tags
            if (tag.closed)
                continue;

            // Same tag?
            if (tag.name == openingTag.name) {
                if (tag.closing) {
                    depth--;
                    if (depth == 0) {
                        // End of tag?
                        p.SkipLinespace();
                        p.SkipEol();

                        b.blockType = BlockType_HtmlTag;
                        b.data = openingTag;
                        b.set_contentEnd(p.m_position);

                        switch (mode) {
                            case MarkdownInHtmlMode_Span:
                                var span = this.CreateBlock(inner_pos);
                                span.buf = p.buf;
                                span.blockType = BlockType_span;
                                span.contentStart = inner_pos;
                                span.contentLen = tagpos - inner_pos;

                                b.children = [];
                                b.children.push(span);
                                break;

                            case MarkdownInHtmlMode_Block:
                            case MarkdownInHtmlMode_Deep:
                                // Scan the internal content
                                var bp = new BlockProcessor(this.m_Markdown, mode == MarkdownInHtmlMode_Deep);
                                b.children = bp.ProcessRange(p.buf, inner_pos, tagpos - inner_pos);
                                break;

                            case MarkdownInHtmlMode_Off:
                                if (bHasUnsafeContent) {
                                    b.blockType = BlockType_unsafe_html;
                                    b.set_contentEnd(p.m_position);
                                }
                                else {
                                    var span = this.CreateBlock(inner_pos);
                                    span.buf = p.buf;
                                    span.blockType = BlockType_html;
                                    span.contentStart = inner_pos;
                                    span.contentLen = tagpos - inner_pos;

                                    b.children = [];
                                    b.children.push(span);
                                }
                                break;
                        }


                        return true;
                    }
                }
                else {
                    depth++;
                }
            }
        }

        // Missing closing tag(s).  
        return false;
    }

    p.ScanHtml = function (p, b) {
        // Remember start of html
        var posStartPiece = p.m_position;

        // Parse a HTML tag
        var openingTag = ParseHtmlTag(p);
        if (openingTag == null)
            return false;

        // Closing tag?
        if (openingTag.closing)
            return false;

        // Safe mode?
        var bHasUnsafeContent = false;
        if (this.m_Markdown.SafeMode && !openingTag.IsSafe())
            bHasUnsafeContent = true;

        var flags = openingTag.get_Flags();

        // Is it a block level tag?
        if ((flags & HtmlTagFlags_Block) == 0)
            return false;

        // Closed tag, hr or comment?
        if ((flags & HtmlTagFlags_NoClosing) != 0 || openingTag.closed) {
            p.SkipLinespace();
            p.SkipEol();
            b.contentLen = p.m_position - b.contentStart;
            b.blockType = bHasUnsafeContent ? BlockType_unsafe_html : BlockType_html;
            return true;
        }

        // Can it also be an inline tag?
        if ((flags & HtmlTagFlags_Inline) != 0) {
            // Yes, opening tag must be on a line by itself
            p.SkipLinespace();
            if (!p.eol())
                return false;
        }

        // Head block extraction?
        var bHeadBlock = this.m_Markdown.ExtractHeadBlocks && openingTag.name.toLowerCase() == "head";
        var headStart = p.m_position;

        // Work out the markdown mode for this element
        if (!bHeadBlock && this.m_Markdown.ExtraMode) {
            var MarkdownMode = this.GetMarkdownMode(openingTag);
            if (MarkdownMode != MarkdownInHtmlMode_NA) {
                return this.ProcessMarkdownEnabledHtml(p, b, openingTag, MarkdownMode);
            }
        }

        var childBlocks = null;

        // Now capture everything up to the closing tag and put it all in a single HTML block
        var depth = 1;

        while (!p.eof()) {
            if (!p.Find('<'))
                break;

            // Save position of current tag
            var posStartCurrentTag = p.m_position;

            var tag = ParseHtmlTag(p);
            if (tag == null) {
                p.SkipForward(1);
                continue;
            }

            // Safe mode checks
            if (this.m_Markdown.SafeMode && !tag.IsSafe())
                bHasUnsafeContent = true;


            // Ignore self closing tags
            if (tag.closed)
                continue;

            // Markdown enabled content?
            if (!bHeadBlock && !tag.closing && this.m_Markdown.ExtraMode && !bHasUnsafeContent) {
                var MarkdownMode = this.GetMarkdownMode(tag);
                if (MarkdownMode != MarkdownInHtmlMode_NA) {
                    var markdownBlock = this.CreateBlock(posStartPiece);
                    if (this.ProcessMarkdownEnabledHtml(p, markdownBlock, tag, MarkdownMode)) {
                        if (childBlocks == null) {
                            childBlocks = [];
                        }

                        // Create a block for everything before the markdown tag
                        if (posStartCurrentTag > posStartPiece) {
                            var htmlBlock = this.CreateBlock(posStartPiece);
                            htmlBlock.buf = p.buf;
                            htmlBlock.blockType = BlockType_html;
                            htmlBlock.contentStart = posStartPiece;
                            htmlBlock.contentLen = posStartCurrentTag - posStartPiece;

                            childBlocks.push(htmlBlock);
                        }

                        // Add the markdown enabled child block
                        childBlocks.push(markdownBlock);

                        // Remember start of the next piece
                        posStartPiece = p.m_position;

                        continue;
                    }
                    else {
                        this.FreeBlock(markdownBlock);
                    }
                }
            }

            // Same tag?
            if (tag.name == openingTag.name && !tag.closed) {
                if (tag.closing) {
                    depth--;
                    if (depth == 0) {
                        // End of tag?
                        p.SkipLinespace();
                        p.SkipEol();

                        // If anything unsafe detected, just encode the whole block
                        if (bHasUnsafeContent) {
                            b.blockType = BlockType_unsafe_html;
                            b.set_contentEnd(p.m_position);
                            return true;
                        }

                        // Did we create any child blocks
                        if (childBlocks != null) {
                            // Create a block for the remainder
                            if (p.m_position > posStartPiece) {
                                var htmlBlock = this.CreateBlock(posStartPiece);
                                htmlBlock.buf = p.buf;
                                htmlBlock.blockType = BlockType_html;
                                htmlBlock.contentStart = posStartPiece;
                                htmlBlock.contentLen = p.m_position - posStartPiece;

                                childBlocks.push(htmlBlock);
                            }

                            // Return a composite block
                            b.blockType = BlockType_Composite;
                            b.set_contentEnd(p.m_position);
                            b.children = childBlocks;
                            return true;
                        }

                        // Extract the head block content
                        if (bHeadBlock) {
                            var content = p.buf.substr(headStart, posStartCurrentTag - headStart);
                            this.m_Markdown.HeadBlockContent = this.m_Markdown.HeadBlockContent + Trim(content) + "\n";
                            b.blockType = BlockType_html;
                            b.contentStart = p.position;
                            b.contentEnd = p.position;
                            b.lineStart = p.position;
                            return true;
                        }

                        // Straight html block
                        b.blockType = BlockType_html;
                        b.contentLen = p.m_position - b.contentStart;
                        return true;
                    }
                }
                else {
                    depth++;
                }
            }
        }

        // Missing closing tag(s).  
        return BlockType_Blank;
    }

    /* 
    * BuildList - build a single <ol> or <ul> list
    */
    p.BuildList = function (lines) {
        // What sort of list are we dealing with
        var listType = lines[0].blockType;

        // Preprocess
        // 1. Collapse all plain lines (ie: handle hardwrapped lines)
        // 2. Promote any unindented lines that have more leading space 
        //    than the original list item to indented, including leading 
        //    special chars
        var leadingSpace = lines[0].get_leadingSpaces();
        for (var i = 1; i < lines.length; i++) {
            // Join plain paragraphs
            if ((lines[i].blockType == BlockType_p) &&
				(lines[i - 1].blockType == BlockType_p || lines[i - 1].blockType == BlockType_ul_li || lines[i - 1].blockType == BlockType_ol_li)) {
                lines[i - 1].set_contentEnd(lines[i].get_contentEnd());
                this.FreeBlock(lines[i]);
                lines.splice(i, 1);
                i--;
                continue;
            }

            if (lines[i].blockType != BlockType_indent && lines[i].blockType != BlockType_Blank) {
                var thisLeadingSpace = lines[i].get_leadingSpaces();
                if (thisLeadingSpace > leadingSpace) {
                    // Change line to indented, including original leading chars 
                    // (eg: '* ', '>', '1.' etc...)
                    lines[i].blockType = BlockType_indent;
                    var saveend = lines[i].get_contentEnd();
                    lines[i].contentStart = lines[i].lineStart + thisLeadingSpace;
                    lines[i].set_contentEnd(saveend);
                }
            }
        }


        // Create the wrapping list item
        var List = this.CreateBlock(0);
        List.blockType = (listType == BlockType_ul_li ? BlockType_ul : BlockType_ol);
        List.children = [];

        // Process all lines in the range		
        for (var i = 0; i < lines.length; i++) {
            // Find start of item, including leading blanks
            var start_of_li = i;
            while (start_of_li > 0 && lines[start_of_li - 1].blockType == BlockType_Blank)
                start_of_li--;

            // Find end of the item, including trailing blanks
            var end_of_li = i;
            while (end_of_li < lines.length - 1 && lines[end_of_li + 1].blockType != BlockType_ul_li && lines[end_of_li + 1].blockType != BlockType_ol_li)
                end_of_li++;

            // Is this a simple or complex list item?
            if (start_of_li == end_of_li) {
                // It's a simple, single line item item
                List.children.push(this.CreateBlock().CopyFrom(lines[i]));
            }
            else {
                // Build a new string containing all child items
                var bAnyBlanks = false;
                var sb = this.m_Markdown.GetStringBuilder();
                for (var j = start_of_li; j <= end_of_li; j++) {
                    var l = lines[j];
                    sb.Append(l.buf.substr(l.contentStart, l.contentLen));
                    sb.Append('\n');

                    if (lines[j].blockType == BlockType_Blank) {
                        bAnyBlanks = true;
                    }
                }

                // Create the item and process child blocks
                var item = this.CreateBlock();
                item.blockType = BlockType_li;
                item.lineStart = lines[start_of_li].lineStart;
                var bp = new BlockProcessor(this.m_Markdown);
                bp.m_parentType = listType;
                item.children = bp.Process(sb.ToString());

                // If no blank lines, change all contained paragraphs to plain text
                if (!bAnyBlanks) {
                    for (var j = 0; j < item.children.length; j++) {
                        var child = item.children[j];
                        if (child.blockType == BlockType_p) {
                            child.blockType = BlockType_span;
                        }
                    }
                }

                // Add the complex item
                List.children.push(item);
            }

            // Continue processing from end of li
            i = end_of_li;
        }

        List.lineStart = List.children[0].lineStart;

        this.FreeBlocks(lines);
        lines.length = 0;

        // Continue processing after this item
        return List;
    }

    /* 
    * BuildDefinition - build a single <dd> item
    */
    p.BuildDefinition = function (lines) {
        // Collapse all plain lines (ie: handle hardwrapped lines)
        for (var i = 1; i < lines.length; i++) {
            // Join plain paragraphs
            if ((lines[i].blockType == BlockType_p) &&
				(lines[i - 1].blockType == BlockType_p || lines[i - 1].blockType == BlockType_dd)) {
                lines[i - 1].set_contentEnd(lines[i].get_contentEnd());
                this.FreeBlock(lines[i]);
                lines.splice(i, 1);
                i--;
                continue;
            }
        }

        // Single line definition
        var bPreceededByBlank = lines[0].data;
        if (lines.length == 1 && !bPreceededByBlank) {
            var ret = lines[0];
            lines.length = 0;
            return ret;
        }

        // Build a new string containing all child items
        var sb = this.m_Markdown.GetStringBuilder();
        for (var i = 0; i < lines.length; i++) {
            var l = lines[i];
            sb.Append(l.buf.substr(l.contentStart, l.contentLen));
            sb.Append('\n');
        }

        // Create the item and process child blocks
        var item = this.CreateBlock(lines[0].lineStart);
        item.blockType = BlockType_dd;
        var bp = new BlockProcessor(this.m_Markdown);
        bp.m_parentType = BlockType_dd;
        item.children = bp.Process(sb.ToString());

        this.FreeBlocks(lines);
        lines.length = 0;

        // Continue processing after this item
        return item;
    }

    p.BuildDefinitionLists = function (blocks) {
        var currentList = null;
        for (var i = 0; i < blocks.length; i++) {
            switch (blocks[i].blockType) {
                case BlockType_dt:
                case BlockType_dd:
                    if (currentList == null) {
                        currentList = this.CreateBlock(blocks[i].lineStart);
                        currentList.blockType = BlockType_dl;
                        currentList.children = [];
                        blocks.splice(i, 0, currentList);
                        i++;
                    }

                    currentList.children.push(blocks[i]);
                    blocks.splice(i, 1);
                    i--;
                    break;

                default:
                    currentList = null;
                    break;
            }
        }
    }


    p.BuildFootnote = function (lines) {
        // Collapse all plain lines (ie: handle hardwrapped lines)
        for (var i = 1; i < lines.length; i++) {
            // Join plain paragraphs
            if ((lines[i].blockType == BlockType_p) &&
				(lines[i - 1].blockType == BlockType_p || lines[i - 1].blockType == BlockType_footnote)) {
                lines[i - 1].set_contentEnd(lines[i].get_contentEnd());
                this.FreeBlock(lines[i]);
                lines.splice(i, 1);
                i--;
                continue;
            }
        }

        // Build a new string containing all child items
        var sb = this.m_Markdown.GetStringBuilder();
        for (var i = 0; i < lines.length; i++) {
            var l = lines[i];
            sb.Append(l.buf.substr(l.contentStart, l.contentLen));
            sb.Append('\n');
        }

        var bp = new BlockProcessor(this.m_Markdown);
        bp.m_parentType = BlockType_footnote;

        // Create the item and process child blocks
        var item = this.CreateBlock(lines[0].lineStart);
        item.blockType = BlockType_footnote;
        item.data = lines[0].data;
        item.children = bp.Process(sb.ToString());

        this.FreeBlocks(lines);
        lines.length = 0;

        // Continue processing after this item
        return item;
    }


    p.ProcessFencedCodeBlock = function (p, b) {
        var fenceStart = p.m_position;

        var delim = p.current();

        // Extract the fence
        p.Mark();
        while (p.current() == delim)
            p.SkipForward(1);
        var strFence = p.Extract();

        // Must be at least 3 long
        if (strFence.length < 3)
            return false;

        // Optional language specifier after the fend
        p.Mark();
        while (!p.eol())
            p.SkipForward(1);
        var strLanguage = p.Extract().trim();

        // Rest of line must be blank
        p.SkipLinespace();
        if (!p.eol())
            return false;

        // Skip the eol and remember start of code
        p.SkipEol();
        var startCode = p.m_position;

        // Find the end fence
        if (!p.Find(strFence))
            return false;

        // Character before must be a eol char
        if (!is_lineend(p.CharAtOffset(-1)))
            return false;

        var endCode = p.m_position;

        // Skip the fence
        p.SkipForward(strFence.length);

        // Whitespace allowed at end
        p.SkipLinespace();
        if (!p.eol())
            return false;

        // Create the code block
        b.blockType = BlockType_codeblock;
        b.language = strLanguage;
        b.children = [];

        // Remove the trailing line end
        // (Javascript version has already normalized line ends to \n)
        endCode--;

        // Create the child block with the entire content
        var child = this.CreateBlock(fenceStart);
        child.blockType = BlockType_indent;
        child.buf = p.buf;
        child.contentStart = startCode;
        child.contentLen = endCode - startCode;
        b.children.push(child);

        // Done
        return true;
    }

    var ColumnAlignment_NA = 0;
    var ColumnAlignment_Left = 1;
    var ColumnAlignment_Right = 2;
    var ColumnAlignment_Center = 3;

    function TableSpec() {
        this.m_Columns = [];
        this.m_Headers = null;
        this.m_Rows = [];
    }

    p = TableSpec.prototype;

    p.LeadingBar = false;
    p.TrailingBar = false;

    p.ParseRow = function (p) {
        p.SkipLinespace();

        if (p.eol())
            return null; 	// Blank line ends the table

        var bAnyBars = this.LeadingBar;
        if (this.LeadingBar && !p.SkipChar('|')) {
            bAnyBars = true;
            return null;
        }

        // Create the row
        var row = [];

        // Parse all columns except the last

        while (!p.eol()) {
            // Find the next vertical bar
            p.Mark();
            while (!p.eol() && p.current() != '|')
                p.SkipEscapableChar(true);

            row.push(Trim(p.Extract()));

            bAnyBars |= p.SkipChar('|');
        }

        // Require at least one bar to continue the table
        if (!bAnyBars)
            return null;

        // Add missing columns
        while (row.length < this.m_Columns.length) {
            row.push("&nbsp;");
        }

        p.SkipEol();
        return row;
    }

    p.RenderRow = function (m, b, row, type) {
        for (var i = 0; i < row.length; i++) {
            b.Append("\t<");
            b.Append(type);

            if (i < this.m_Columns.length) {
                switch (this.m_Columns[i]) {
                    case ColumnAlignment_Left:
                        b.Append(" align=\"left\"");
                        break;
                    case ColumnAlignment_Right:
                        b.Append(" align=\"right\"");
                        break;
                    case ColumnAlignment_Center:
                        b.Append(" align=\"center\"");
                        break;
                }
            }

            b.Append(">");
            m.m_SpanFormatter.Format2(b, row[i]);
            b.Append("</");
            b.Append(type);
            b.Append(">\n");
        }
    }

    p.Render = function (m, b) {
        b.Append("<table>\n");
        if (this.m_Headers != null) {
            b.Append("<thead>\n<tr>\n");
            this.RenderRow(m, b, this.m_Headers, "th");
            b.Append("</tr>\n</thead>\n");
        }

        b.Append("<tbody>\n");
        for (var i = 0; i < this.m_Rows.length; i++) {
            var row = this.m_Rows[i];
            b.Append("<tr>\n");
            this.RenderRow(m, b, row, "td");
            b.Append("</tr>\n");
        }
        b.Append("</tbody>\n");

        b.Append("</table>\n");
    }

    function TableSpec_Parse(p) {
        // Leading line space allowed
        p.SkipLinespace();

        // Quick check for typical case
        if (p.current() != '|' && p.current() != ':' && p.current() != '-')
            return null;

        // Don't create the spec until it at least looks like one
        var spec = null;

        // Leading bar, looks like a table spec
        if (p.SkipChar('|')) {
            spec = new TableSpec();
            spec.LeadingBar = true;
        }


        // Process all columns
        while (true) {
            // Parse column spec
            p.SkipLinespace();

            // Must have something in the spec
            if (p.current() == '|')
                return null;

            var AlignLeft = p.SkipChar(':');
            while (p.current() == '-')
                p.SkipForward(1);
            var AlignRight = p.SkipChar(':');
            p.SkipLinespace();

            // Work out column alignment
            var col = ColumnAlignment_NA;
            if (AlignLeft && AlignRight)
                col = ColumnAlignment_Center;
            else if (AlignLeft)
                col = ColumnAlignment_Left;
            else if (AlignRight)
                col = ColumnAlignment_Right;

            if (p.eol()) {
                // Not a spec?
                if (spec == null)
                    return null;

                // Add the final spec?
                spec.m_Columns.push(col);
                return spec;
            }

            // We expect a vertical bar
            if (!p.SkipChar('|'))
                return null;

            // Create the table spec
            if (spec == null)
                spec = new TableSpec();

            // Add the column
            spec.m_Columns.push(col);

            // Check for trailing vertical bar
            p.SkipLinespace();
            if (p.eol()) {
                spec.TrailingBar = true;
                return spec;
            }

            // Next column
        }
    }

    // Exposed stuff
    this.Markdown = Markdown;
    this.HtmlTag = HtmlTag;
    this.SplitUserSections = SplitUserSections;
} ();

// Export to nodejs
if (typeof exports !== 'undefined')
{
    exports.Markdown = MarkdownDeep.Markdown;
    exports.SplitUserSections = MarkdownDeep.SplitUserSections;
}

