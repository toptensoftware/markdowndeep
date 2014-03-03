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

/*
Usage:

// 1. Create the editor an bind to a text area, output div and an optional source view div
        - text area: the text area that user types to.
        - output div: a div where the transformed html will be displayed
        - source view view: an optional div where a "source" view of the rendered html will be placed
      
    var editor=new MarkdownDeepEditor.Editor(textarea_element, output_div, source_div)
    
// 2. Optionally set options

        editor.disableShortCutKeys=true;    // Disable Ctrl+B, Ctrl+I etc...
        editor.disableAutoIndent=true;      // Disable auto indent on enter key
        editor.disableTabHandling=true;     // Disable tab/shift+tab for indent
    
// 3. Optionally install hooks
    
        editor.onPreTransform=function(editor, markdown) {}
        editor.onPostTransform=function(editor, html) {}
        editor.onPostUpdateDom=function(editor) {}

// 4. Optionally create a toolbar/UI that calls editor.InvokeCommand(cmd) where cmd is one of:        

        - "undo",
        - "redo",
        - "bold",
        - "italic",
        - "heading",
        - "code",
        - "ullist",
        - "ollist",
        - "indent",
        - "outdent",
        - "link",
        - "img",
        - "hr",
        - "h0",
        - "h1",
        - "h2",
        - "h3",
        - "h4",
        - "h5",
        - "h6"
        
      eg: editor.InvokeCommand("heading") to toggle heading style of selection
    
*/

var MarkdownDeepEditor=new function(){

    // private:priv.
    // private:.m_*
    // private:.m_listType
    // private:.m_prefixLen
    

    var ie=false;
    
    // Various keycodes
    var keycode_tab = 9;
    var keycode_enter = 13;
    var keycode_pgup = 33;
    var keycode_pgdn = 34;
    var keycode_home = 36;
    var keycode_end = 35;
    var keycode_left = 37;
    var keycode_right = 39;
    var keycode_up = 38;
    var keycode_down = 40;
    var keycode_backspace = 8;
    var keycode_delete = 46;
    
    // Undo modes for the undo stack
    var undomode_unknown = 0;
    var undomode_text = 1;
    var undomode_erase = 2;
    var undomode_navigate = 3;
    var undomode_whitespace = 4;
    
    // Shortcut keys Ctrl+key
    var shortcut_keys={
        "Z": "undo",
        "Y": "redo",
        "B": "bold",
        "I": "italic",
        "H": "heading",
        "K": "code",
        "U": "ullist",
        "O": "ollist",
        "Q": "indent",
        "E": "outdent",
        "L": "link",
        "G": "img",
        "R": "hr",
        "0": "h0",
        "1": "h1",
        "2": "h2",
        "3": "h3",
        "4": "h4",
        "5": "h5",
        "6": "h6"
    }

    function starts_with(str, match)
    {
        return str.substr(0, match.length)==match;
    }
    
    function ends_with(str, match)
    {
        return str.substr(-match.length)==match;
    }

    function is_whitespace(ch)
    {
        return (ch==' ' || ch=='\t' || ch=='\r' || ch=='\n');
    }
    
    function is_crlf(ch)
    {
        return (ch=='\r' || ch=='\n');
    }
    
    function trim(str)
    {
        var i=0;
        var l=str.length;
        
        while (i<l && is_whitespace(str.charAt(i)))
            i++;
        while (l-1>i && is_whitespace(str.charAt(l-1)))
            l--;
            
        return str.substr(i, l-i);
    }


    // Helper for binding events
    function BindEvent(obj, event, handler)
    {
        if (obj.addEventListener)
        {
            obj.addEventListener(event, handler, false);
        }
        else if (obj.attachEvent)
        {
            obj.attachEvent("on"+event, handler);
        }
    }
    
    // Helper for unbinding events
    function UnbindEvent(obj, event, handler)
    {
        if (obj.removeEventListener)
        {
            obj.removeEventListener(event, handler, false);
        }
        else if (obj.detachEvent)
        {
            obj.detachEvent("on"+event, handler);
        }
    }
    
    function PreventEventDefault(event)
    {
        if (event.preventDefault)
        {
            event.preventDefault();
        }
        if (event.cancelBubble!==undefined)
        {
            event.cancelBubble=true;
            event.keyCode=0;
            event.returnValue=false;
        }
        return false;
    }
    
    function offsetToRangeCharacterMove(el, offset) 
    {
        return offset - (el.value.slice(0, offset).split("\r\n").length - 1);
    }

    // EditorState represents the initial and final state of an edit
    function EditorState()
    {
    }

    priv=EditorState.prototype;

    priv.InitFromTextArea=function(textarea)
    {
        this.m_textarea=textarea;
        if (ie)
        {
            var sel=document.selection.createRange();
            var temp=sel.duplicate();
            temp.moveToElementText(textarea);
            var basepos=-temp.moveStart('character', -10000000);
            
            this.m_selectionStart = -sel.moveStart('character', -10000000)-basepos;
            this.m_selectionEnd = -sel.moveEnd('character', -10000000)-basepos;
            this.m_text=textarea.value.replace(/\r\n/gm,"\n");
        }
        else
        {
            this.m_selectionStart = textarea.selectionStart;
            this.m_selectionEnd = textarea.selectionEnd;
            this.m_text=textarea.value;
        }
    }
    
    priv.Duplicate=function()
    {
        var other=new EditorState();
        other.m_textarea=this.m_textarea;
        other.m_selectionEnd=this.m_selectionEnd;
        other.m_selectionStart=this.m_selectionStart;
        other.m_text=this.m_text;
        return other;
    }
    
    priv.Apply=function()
    {
        if (ie)
        {
            this.m_textarea.value=this.m_text;
            this.m_textarea.focus();
            var r=this.m_textarea.createTextRange();
            r.collapse(true);
            r.moveEnd("character", this.m_selectionEnd);
            r.moveStart("character", this.m_selectionStart);
            r.select();
        }
        else
        {
            // Set the new text 
            var scrollTop=this.m_textarea.scrollTop;
            this.m_textarea.value=this.m_text;
            this.m_textarea.focus();
            this.m_textarea.setSelectionRange(this.m_selectionStart, this.m_selectionEnd);
            this.m_textarea.scrollTop=scrollTop;
        }
    }
    
    priv.ReplaceSelection=function(str)
    {
        this.m_text=this.m_text.substr(0, this.m_selectionStart) + str + this.m_text.substr(this.m_selectionEnd);
        this.m_selectionEnd=this.m_selectionStart + str.length;
    }

    function adjust_pos(pos2, editpos, del, ins)
    {
        if (pos2<editpos)
            return pos2;
        return pos2<editpos+del ? editpos : pos2 + ins - del;
    }
    
    priv.ReplaceAt=function(pos, len, str)
    {
        this.m_text=this.m_text.substr(0, pos) + str + this.m_text.substr(pos+len);
        this.m_selectionStart=adjust_pos(this.m_selectionStart, pos, len, str.length);
        this.m_selectionEnd=adjust_pos(this.m_selectionEnd, pos, len, str.length);
    }
    
    priv.getSelectedText=function()
    {
        return this.m_text.substr(this.m_selectionStart, this.m_selectionEnd-this.m_selectionStart);
    }
    
    priv.InflateSelection=function(ds, de)
    {
        this.m_selectionEnd+=de;
        this.m_selectionStart-=ds;
    }
    
    priv.PreceededBy=function(str)
    {
        return this.m_selectionStart >= str.length && this.m_text.substr(this.m_selectionStart-str.length, str.length)==str;
    }
    
    priv.FollowedBy=function(str)
    {
        return this.m_text.substr(this.m_selectionEnd, str.length)==str;
    }
    
    priv.TrimSelection=function()
    {
        while (is_whitespace(this.m_text.charAt(this.m_selectionStart)))
            this.m_selectionStart++;
        while (this.m_selectionEnd>this.m_selectionStart && is_whitespace(this.m_text.charAt(this.m_selectionEnd-1)))
            this.m_selectionEnd--;
    }
    
    priv.IsStartOfLine=function(pos)
    {
        return pos==0 || is_crlf(this.m_text.charAt(pos-1));
    }
    
    priv.FindStartOfLine=function(pos)
    {
        // Move start of selection back to line start
        while (pos>0 && !is_crlf(this.m_text.charAt(pos-1)))
        {  
            pos--;
        }
        return pos;
    }    
    
    priv.FindEndOfLine=function(pos)
    {
        while (pos<this.m_text.length && !is_crlf(this.m_text.charAt(pos)))
        {
            pos++;
        }
        return pos;
    }
    
    priv.FindNextLine=function(pos)
    {
        return this.SkipEol(this.FindEndOfLine(pos));
    }
    
    priv.SkipWhiteSpace=function(pos)
    {
        while (pos<this.m_text.length && is_whitespace(this.m_text.charAt(pos)))
            pos++;
        return pos;
    }
    
    priv.SkipEol=function(pos)
    {
        if (this.m_text.substr(pos, 2)=="\r\n")
            return pos+2;
        if (is_crlf(this.m_text.charAt(pos)))
            return pos+1;
        return pos;
    }
    
    priv.SkipPreceedingEol=function(pos)
    {
        if (pos>2 && this.m_text.substr(pos-2, 2)=="\r\n")
            return pos-2;
        if (pos>1 && is_crlf(this.m_text.charAt(pos-1)))
            return pos-1;
        return pos;
    }
    
    priv.SelectWholeLines=function()
    {
        // Move selection to start of line
        this.m_selectionStart=this.FindStartOfLine(this.m_selectionStart);
        
        // Move end of selection to start of the next line
        if (!this.IsStartOfLine(this.m_selectionEnd))
        {
            this.m_selectionEnd=this.SkipEol(this.FindEndOfLine(this.m_selectionEnd));
        }
    }
    
    priv.SkipPreceedingWhiteSpace=function(pos)
    {
        while (pos>0 && is_whitespace(this.m_text.charAt(pos-1)))
        {
            pos--;
        }
        return pos;
    }
    
    priv.SkipFollowingWhiteSpace=function(pos)
    {
        while (is_whitespace(this.m_text.charAt(pos)))
        {
            pos++;
        }
        return pos;
    }
    priv.SelectSurroundingWhiteSpace=function()
    {
        this.m_selectionStart=this.SkipPreceedingWhiteSpace(this.m_selectionStart);
        this.m_selectionEnd=this.SkipFollowingWhiteSpace(this.m_selectionEnd);
    }
    
    priv.CheckSimpleSelection=function()
    {
        var text=this.getSelectedText();
        var m=text.match(/\n[ \t\r]*\n/);
        
        if (m)
        {
            alert("Please make a selection that doesn't include a paragraph break");
            return false;
        }
        
        return true;
    }

    // Check if line is completely blank    
    priv.IsBlankLine=function(p)
    {
        var len=this.m_text.length;
        for (var i=p; i<len; i++)
        {
            var ch=this.m_text[i];
            if (is_crlf(ch))
                return true;
            if (!is_whitespace(this.m_text.charAt(i)))
                return false;
        }
        
        return true;
    }
    
    priv.FindStartOfParagraph=function(pos)
    {
        var savepos=pos;
        
        // Move to start of first line
        pos=this.FindStartOfLine(pos);
        
        if (this.IsBlankLine(pos))
            return pos;

        // Move to first line after blank line
        while (pos>0)
        {
            var p=this.FindStartOfLine(this.SkipPreceedingEol(pos));
            if (p==0)
                break;
            if (this.IsBlankLine(p))
                break;
            pos=p;
        }
        
        // Is it a list?
        if (this.DetectListType(pos).m_prefixLen!=0)
        {
            // Do it again, but stop at line with list prefix
            pos=this.FindStartOfLine(savepos);
            
            // Move to first line after blank line
            while (pos>0)
            {
                if (this.DetectListType(pos).m_prefixLen!=0)
                    return pos;
                    
                // go to line before
                pos=this.FindStartOfLine(this.SkipPreceedingEol(pos));
            }
        }
        
        return pos;
    }
    
    priv.FindEndOfParagraph=function(pos)
    {
        // Skip all lines that aren't blank
        while (pos<this.m_text.length)
        {
            if (this.IsBlankLine(pos))
                break;
                
            pos=this.FindNextLine(pos);
        }
        
        return pos;
    }
    
    // Select the paragraph
    priv.SelectParagraph=function()
    {
        this.m_selectionStart=this.FindStartOfParagraph(this.m_selectionStart);
        this.m_selectionEnd=this.FindEndOfParagraph(this.m_selectionStart);        
    }
    
    // Starting at position pos, return the list type
    // returns { m_listType, m_prefixLen } 
    priv.DetectListType=function(pos)
    {
        var prefix=this.m_text.substr(pos, 10);
        var m=prefix.match(/^\s{0,3}(\*|\d+\.)(?:\ |\t)*/);
        if (!m)
            return {m_listType:"", m_prefixLen:0};
            
        if (m[1]=='*')
            return {m_listType:"*", m_prefixLen:m[0].length};
        else
            return {m_listType:"1", m_prefixLen:m[0].length};
    }
    
    
    

    // Editor
    function Editor(textarea, div_html)
    {
        // Is it IE?
        if (!textarea.setSelectionRange)
        {
            ie=true;
        }
    
        // Initialize
        this.m_lastContent=null;
        this.m_undoStack=[];
        this.m_undoPos=0;
        this.m_undoMode=undomode_navigate;
        this.Markdown=new MarkdownDeep.Markdown();
        this.Markdown.SafeMode=false;
        this.Markdown.ExtraMode=true;
        this.Markdown.NewWindowForLocalLinks=true;
        this.Markdown.NewWindowForExternalLinks=true;
        
        // Store DOM elements
        this.m_textarea=textarea;
        this.m_divHtml=div_html;

        // Bind events
        var ed=this;
        BindEvent(textarea, "keyup", function(){ed.onMarkdownChanged();});
        BindEvent(textarea, "keydown", function(e){return ed.onKeyDown(e);});
        BindEvent(textarea, "paste", function(){ed.onMarkdownChanged();});
        BindEvent(textarea, "input", function(){ed.onMarkdownChanged();});
        BindEvent(textarea, "mousedown", function(){ed.SetUndoMode(undomode_navigate);});

        // Do initial update
        this.onMarkdownChanged();
    }

    var priv=Editor.prototype;
    var pub=Editor.prototype;
    
    
    priv.onKeyDown=function(e)
    {
        var newMode=null;
        var retv=true;
        
        // Normal keys only
        if(e.ctrlKey || e.metaKey)
        {
            var key=String.fromCharCode(e.charCode||e.keyCode);
                    
            // Built in short cut key?
            if (!this.disableShortCutKeys && shortcut_keys[key]!=undefined)
            {
                this.InvokeCommand(shortcut_keys[key]);
                return PreventEventDefault(e);
            }
            
            // Standard keys
            switch (key)
            {
                case "V":   // Paste
                    newMode=undomode_text;
                    break;
                    
                case "X":   // Cut
                    newMode=undomode_erase;
                    break;
            }
        }
        else
        {
            switch (e.keyCode)
            {
                case keycode_tab:
                    if (!this.disableTabHandling)
                    {
                        this.InvokeCommand(e.shiftKey ? "untab" : "tab");
                        return PreventEventDefault(e);
                    }
                    else
                    {
                        newMode=undomode_text;
                    }
                    break;
                        
            
                case keycode_left:
                case keycode_right:
                case keycode_up:
                case keycode_down:
                case keycode_home:
                case keycode_end:
                case keycode_pgup:
                case keycode_pgdn:
                    // Navigation mode
                    newMode=undomode_navigate;
                    break;

                case keycode_backspace:
                case keycode_delete:
                    // Delete mode
                    newMode=undomode_erase;
                    break;
                
                case keycode_enter:
                    // New lines mode
                    newMode=undomode_whitespace;
                    break;
                
                default:
                    // Text mode
                    newMode=undomode_text;
            }
        }

        if (newMode!=null)
            this.SetUndoMode(newMode);

        // Special handling for enter key
        if (!this.disableAutoIndent)
        {
            if (e.keyCode==keycode_enter && (!ie || e.ctrlKey))
            {
                this.IndentNewLine();
            }
        }
    } 

    priv.SetUndoMode=function(newMode)
    {
        // Same mode?
        if (this.m_undoMode==newMode)
            return;
            
        // Enter new mode, after capturing current state
        this.m_undoMode=newMode;
        
        // Capture undo state
        this.CaptureUndoState();
    }

    
    priv.CaptureUndoState=function()
    {
        // Store a copy on the undo stack
        var state=new EditorState();
        state.InitFromTextArea(this.m_textarea);
        this.m_undoStack.splice(this.m_undoPos, this.m_undoStack.length-this.m_undoPos, state);        
        this.m_undoPos=this.m_undoStack.length;
    }
    
    priv.onMarkdownChanged=function(bCreateUndoUnit)
    {
        // Get the markdown, see if it's changed
        var new_content=this.m_textarea.value;
        if (new_content===this.m_lastContent && this.m_lastContent!==null)
	        return;
	        
    	// Call pre hook
    	if (this.onPreTransform)
    	    this.onPreTransform(this, new_content);
    
        // Transform
        var output=this.Markdown.Transform(new_content);

        // Call post hook
    	if (this.onPostTransform)
    	    this.onPostTransform(this, output);

    	// Update the DOM
        if (this.m_divHtml)
            this.m_divHtml.innerHTML=output;
            /*
        if (this.m_divSource)
        {
            this.m_divSource.innerHTML="";
            this.m_divSource.appendChild(document.createTextNode(output));
        }
        */
        
        // Call post update dom handler
        if (this.onPostUpdateDom)
            this.onPostUpdateDom(this);

        // Save previous content
        this.m_lastContent=new_content;
    }

    // Public method, should be called by client code if any of the MarkdownDeep
    // transform options have changed
    pub.onOptionsChanged=function()
    {
        this.m_lastContent=null;
        this.onMarkdownChanged();
    }
    
    pub.cmd_undo=function()
    {
        if (this.m_undoPos > 0)
        {
            // Capture current state at end of undo buffer.
            if (this.m_undoPos==this.m_undoStack.length)
            {
                this.CaptureUndoState();
                this.m_undoPos--;
            }

            this.m_undoPos--;
            this.m_undoStack[this.m_undoPos].Apply();
            this.m_undoMode=undomode_unknown;

            // Update markdown rendering
            this.onMarkdownChanged();
        }
    }
    
    pub.cmd_redo=function()
    {
        if (this.m_undoPos+1 < this.m_undoStack.length)
        {
            this.m_undoPos++;
            this.m_undoStack[this.m_undoPos].Apply();
            this.m_undoMode=undomode_unknown;

            // Update markdown rendering
            this.onMarkdownChanged();

            // We're back at the current state            
            if (this.m_undoPos==this.m_undoStack.length-1)
            {
                this.m_undoStack.pop();
            }
        }
    }
    
    priv.setHeadingLevel=function(state, headingLevel)
    {
        // Select the entire heading
        state.SelectParagraph();
        state.SelectSurroundingWhiteSpace();
        
        // Get the selected text
        var text=state.getSelectedText();
        
        // Trim all whitespace
        text=trim(text);

        var currentHeadingLevel=0;
        var m=text.match(/^(\#+)(.*?)(\#+)?$/);
        if (m)
        {
            text=trim(m[2]);
            currentHeadingLevel=m[1].length;
        }
        else
        {
            m=text.match(/^(.*?)(?:\r\n|\n|\r)\s*(\-*|\=*)$/);
            if (m)
            {
                text=trim(m[1]);
                currentHeadingLevel=m[2].charAt(0)=="=" ? 1 : 0;
            }
            else
            {
                // Remove blank lines        
                text=text.replace(/(\r\n|\n|\r)/gm,"");
                currentHeadingLevel=0;
            }
        }
        
        if (headingLevel==-1)
            headingLevel=(currentHeadingLevel+1) % 4;
        
        // Removing a heading
        var selOffset=0;
        var selLen=0;
        if (headingLevel==0)
        {
            // Deleting selection
            if (text=="Heading")
            {
                state.ReplaceSelection("");
                return true;
            }
            
            selLen=text.length;
            selOffset=0;
        }
        else
        {
            if (text=="")
                text="Heading";

            selOffset=headingLevel+1;
            selLen=text.length;
                
            var h="";
            for (var i=0; i<headingLevel; i++)
                h+="#";
                
            text=h + " " + text + " " + h;
            
        }
        
        // Require blank after
        text+="\n\n";

        if (state.m_selectionStart!=0)
        {
            text="\n\n" + text;
            selOffset+=2;
        }

        // Replace text
        state.ReplaceSelection(text);
        
        // Update selection
        state.m_selectionStart+=selOffset;
        state.m_selectionEnd=state.m_selectionStart + selLen;

        return true;
    }
    
    pub.cmd_heading=function(state)
    {
        return this.setHeadingLevel(state, -1);
    }
    
    pub.cmd_h0=function(state)
    {
        return this.setHeadingLevel(state, 0);
    }

    pub.cmd_h1=function(state)
    {
        return this.setHeadingLevel(state, 1);
    }

    pub.cmd_h2=function(state)
    {
        return this.setHeadingLevel(state, 2);
    }

    pub.cmd_h3=function(state)
    {
        return this.setHeadingLevel(state, 3);
    }

    pub.cmd_h4=function(state)
    {
        return this.setHeadingLevel(state, 4);
    }

    pub.cmd_h5=function(state)
    {
        return this.setHeadingLevel(state, 5);
    }

    pub.cmd_h6=function(state)
    {
        return this.setHeadingLevel(state, 6);
    }

    priv.IndentCodeBlock=function(state, indent)
    {
        // Make sure whole lines are selected
        state.SelectWholeLines();
        
        // Get the text, split into lines 
        var lines=state.getSelectedText().split("\n");
        
		// Convert leading tabs to spaces   
        for (var i=0; i<lines.length; i++)
        {
			if (lines[i].charAt(0)=="\t")
			{
				var newLead="";
				var p=0;
				while (lines[i].charAt(p)=="\t")
				{
					newLead+="    ";
					p++;
				}
				
				var newLine=newLead + lines[i].substr(p);
				lines.splice(i, 1, newLine);
			}
        }

        // Toggle indent/unindent?
        if (indent===null)
        {
            var i;
            for (i=0; i<lines.length; i++)
            {
                // Blank lines are allowed
                if (trim(lines[i])=="")
                    continue;
                 
				// Convert leading tabs to spaces   
				if (lines[i].charAt(0)=="\t")
				{
					var newLead="";
					var p=0;
					while (lines[i].charAt(p)=="\t")
					{
						newLead+="    ";
						p++;
					}
					
					var newLine=newLead + lines[i].substr(i);
					lines.splice(i, 1, newLine);
				}
					
                // Tabbed line
                if (!starts_with(lines[i], "    "))
                    break;
            }

            // Are we adding or removing indent
            indent=i!=lines.length;
        }
        
        // Apply the changes
        for (var i=0; i<lines.length; i++)
        {
            // Blank line?
            if (trim(lines[i])=="")
                continue;
                
            // Tabbed line
            var newline=lines[i];
            if (indent)
            {
                newline="    " + lines[i];
            }
            else
            {
                if (starts_with(lines[i], "\t"))
                    newline=lines[i].substr(1);
                else if (starts_with(lines[i], "    "))
                    newline=lines[i].substr(4);
            }
            
            lines.splice(i, 1, newline);
        }
        
        // Replace
        state.ReplaceSelection(lines.join("\n"));
    }
    
    // Code
    pub.cmd_code=function(state)
    {
        // Cursor on a blank line?
		if (state.m_selectionStart==state.m_selectionEnd)
		{
			var line=state.FindStartOfLine(state.m_selectionStart);
			if (state.IsBlankLine(line))
			{
				state.SelectSurroundingWhiteSpace();
				state.ReplaceSelection("\n\n    Code\n\n");
				state.m_selectionStart+=6;
				state.m_selectionEnd=state.m_selectionStart + 4;
				return true;
			}
		}       
	
        // If the current text is preceeded by a non-whitespace, or followed by a non-whitespace
        // then do an inline code
        if (state.getSelectedText().indexOf("\n")<0)
        {
            // Expand selection to include leading/trailing stars
            state.TrimSelection();
            if (state.PreceededBy("`"))
                state.m_selectionStart--;
            if (state.FollowedBy("`"))
                state.m_selectionEnd++;
            return this.bold_or_italic(state, "`");
        }
        
        this.IndentCodeBlock(state, null);    
        return true;        
    }
    
    pub.cmd_tab=function(state)
    {
        if (state.getSelectedText().indexOf("\n")>0)
        {
            this.IndentCodeBlock(state, true);
        }
        else
        {
            // If we're in the leading whitespace of a line
            // insert spaces instead of an actual tab character
            var lineStart=state.FindStartOfLine(state.m_selectionStart);
            var p;
            for (p=lineStart; p<state.m_selectionStart; p++)
            {
                if (state.m_text.charAt(p)!=' ')
                    break;
            }
            
            // All spaces?
            if (p==state.m_selectionStart)
            {
                var spacesToNextTabStop=4-((p-lineStart)%4);
                state.ReplaceSelection("    ".substr(0, spacesToNextTabStop));
            }
            else
            {  
                state.ReplaceSelection("\t");
            }
            state.m_selectionStart=state.m_selectionEnd;
        }
        return true;
    }
    
    pub.cmd_untab=function(state)
    {
        if (state.getSelectedText().indexOf("\n")>0)
        {
            this.IndentCodeBlock(state, false);
            return true;
        }
        return false;
    }
    
    priv.bold_or_italic=function(state, marker)
    {
        var t=state.m_text;
        var ml=marker.length;
        
        // Work out if we're adding or removing bold markers
        var text=state.getSelectedText();
        if (starts_with(text, marker) && ends_with(text, marker))
        {
            // Remove 
            state.ReplaceSelection(text.substr(ml, text.length-ml*2));
        }
        else
        {
            // Add
            state.TrimSelection();
            text=state.getSelectedText();
            if (!text)
                text="text";
            else
                text=text.replace(/(\r\n|\n|\r)/gm,"");
            state.ReplaceSelection(marker + text + marker);
            state.InflateSelection(-ml, -ml);
        }
        return true;
    }
    
    // Bold
    pub.cmd_bold=function(state)
    {
        if (!state.CheckSimpleSelection())
            return false;
        state.TrimSelection();
            
        // Expand selection to include leading/trailing stars
        if (state.PreceededBy("**"))
            state.m_selectionStart-=2;
        if (state.FollowedBy("**"))
            state.m_selectionEnd+=2;
            
        return this.bold_or_italic(state, "**");
    }
    
    // Italic
    pub.cmd_italic=function(state)
    {
        if (!state.CheckSimpleSelection())
            return false;
        state.TrimSelection();
            
        // Expand selection to include leading/trailing stars
        if ((state.PreceededBy("*") && !state.PreceededBy("**")) || state.PreceededBy("***"))
            state.m_selectionStart-=1;
        if ((state.FollowedBy("*") && !state.PreceededBy("**")) || state.FollowedBy("***"))
            state.m_selectionEnd+=1;
            
        return this.bold_or_italic(state, "*");
    }
    
    priv.indent_or_outdent=function(state, outdent)
    {
        if (false && state.m_selectionStart==state.m_selectionEnd)
        {
            state.SelectSurroundingWhiteSpace();
            state.ReplaceSelection("\n\n> Quote\n\n");
            state.m_selectionStart+=4;
            state.m_selectionEnd=state.m_selectionStart+5;
            return true;
        }
        
        // Make sure whole lines are selected
        state.SelectWholeLines();
        
        // Get the text, split into lines and check if all lines
        // are indented
        var lines=state.getSelectedText().split("\n");
        
        // Apply the changes
        for (var i=0; i<lines.length-1; i++)
        {
            // Tabbed line
            var newline=lines[i];
            if (outdent)
            {
                if (starts_with(lines[i], "> "))
                    newline=lines[i].substr(2);
            }
            else
            {
                newline="> " + lines[i];
            }
            
            lines.splice(i, 1, newline);
        }
        
        // Replace
        state.ReplaceSelection(lines.join("\n"));
        
        return true;        
    }
    
    // Quote
    pub.cmd_indent=function(state)
    {
        return this.indent_or_outdent(state, false);
    }
    
    pub.cmd_outdent=function(state)
    {
        return this.indent_or_outdent(state, true);
    }

    priv.handle_list=function(state, type)
    {
        // Build an array of selected line offsets        
        var lines=[];
        if (state.getSelectedText().indexOf("\n")>0)
        {
            state.SelectWholeLines();
            
            var line=state.m_selectionStart;
            lines.push(line);
            
            while (true)
            {
                line=state.FindNextLine(line);
                if (line>=state.m_selectionEnd)
                    break;  
                lines.push(line);
            }
        }
        else
        {
            lines.push(state.FindStartOfLine(state.m_selectionStart));
        }
        
        // Now work out the new list type
        // If the current selection only contains the current list type
        // then remove list items
        var prefix = type=="*" ? "* " : "1. ";
        for (var i=0; i<lines.length; i++)
        {
            var lt=state.DetectListType(lines[i]);
            if (lt.m_listType==type)
            {
                prefix="";
                break;
            }
        }

        // Update the prefix on all lines
        for (var i=lines.length-1; i>=0; i--)
        {
            var line=lines[i];
            var lt=state.DetectListType(line);
            state.ReplaceAt(line, lt.m_prefixLen, prefix);
        }
        
        // We now need to find any surrounding lists and renumber them
        var mdd=new MarkdownDeep.Markdown();
        mdd.ExtraMode=true;
        var listitems=mdd.GetListItems(state.m_text, state.m_selectionStart);
        
        while (listitems!=null)
        {
            // Process each list item
            var dx=0;
            for (var i=0; i<listitems.length-1; i++)
            {
                // Detect the list type
                var lt=state.DetectListType(listitems[i]+dx);
                if (lt.m_listType!="1")
                    break;
                    
                // Format new number prefix
                var newNumber=(i+1).toString() + ". ";
                
                // Replace it
                state.ReplaceAt(listitems[i]+dx, lt.m_prefixLen, newNumber);
                
                // Adjust things if new prefix is different length to the previos
                dx += newNumber.length - lt.m_prefixLen;
            }
            
            
            var newlistitems=mdd.GetListItems(state.m_text, listitems[listitems.length-1]+dx);
            if (newlistitems!=null && newlistitems[0]!=listitems[0])
                listitems=newlistitems;
            else
                listitems=null;
        }
        
        
        // Select lines
        if (lines.length>1)
        {
            state.SelectWholeLines();
        }
        
        return true;
    }
    
    
    pub.cmd_ullist=function(state)
    {
        return this.handle_list(state, "*");
    }
    
    pub.cmd_ollist=function(state)
    {
        return this.handle_list(state, "1");
    }
    
    pub.cmd_link=function(ctx)
    {
        ctx.TrimSelection();
        if (!ctx.CheckSimpleSelection())
            return false;
            
        var url=prompt("Enter the target URL:");
        if (url===null)
            return false;

        var text=ctx.getSelectedText();
        if (text.length==0)
        {
            text="link text";
        }
            
        var str="[" + text + "](" + url + ")";
        
        ctx.ReplaceSelection(str);
        ctx.m_selectionStart++;
        ctx.m_selectionEnd=ctx.m_selectionStart + text.length;
        return true;
    }
        
    pub.cmd_img=function(ctx)
    {
        ctx.TrimSelection();
        if (!ctx.CheckSimpleSelection())
            return false;

        var url=prompt("Enter the image URL");
        if (url===null)
            return false;
            
        var alttext=ctx.getSelectedText();
        if (alttext.length==0)
        {
            alttext="Image Text";
        }
        
        var str="![" + alttext + "](" + url + ")";
        
        ctx.ReplaceSelection(str);
        ctx.m_selectionStart+=2;
        ctx.m_selectionEnd=ctx.m_selectionStart + alttext.length;
        return true;
    }
        
    pub.cmd_hr=function(state)
    {
        state.SelectSurroundingWhiteSpace();
        if (state.m_selectionStart==0)
            state.ReplaceSelection("----------\n\n");
        else
            state.ReplaceSelection("\n\n----------\n\n");
        state.m_selectionStart=state.m_selectionEnd;;
        return true;
    }
    
    pub.IndentNewLine=function()
    {
        var editor=this;
        var timer;
        var handler=function() 
        {
            window.clearInterval(timer);
                    
            // Create an editor state from the current selection
            var state=new EditorState();
            state.InitFromTextArea(editor.m_textarea);

            // Find start of previous line
            var prevline=state.FindStartOfLine(state.SkipPreceedingEol(state.m_selectionStart));
            
            // Count spaces and tabs
            var i=prevline;
            while (true)
            {
                var ch=state.m_text.charAt(i);
                if (ch!=' ' && ch!='\t')
                    break;
                i++;
            }
            
            // Copy spaces and tabs to the new line
            if (i>prevline)
            {
                state.ReplaceSelection(state.m_text.substr(prevline, i-prevline));
                state.m_selectionStart=state.m_selectionEnd;
            }
            
            state.Apply();
        }

        timer=window.setInterval(handler, 1);

        return false;
    }
    
    pub.cmd_indented_newline=function(state)
    {
        // Do default new line
        state.ReplaceSelection("\n");
        state.m_selectionStart=state.m_selectionEnd;
        
        // Find start of previous line
        var prevline=state.FindStartOfLine(state.SkipPreceedingEol(state.m_selectionStart));
        
        // Count spaces and tabs
        var i=prevline;
        while (true)
        {
            var ch=state.m_text.charAt(i);
            if (ch!=' ' && ch!='\t')
                break;
            i++;
        }
        
        // Copy spaces and tabs to the new line
        if (i>prevline)
        {
            state.ReplaceSelection(state.m_text.substr(prevline, i-prevline));
            state.m_selectionStart=state.m_selectionEnd;
        }

        return true;
    }
    
    // Handle toolbar button
    pub.InvokeCommand=function(id)
    {
        // Special handling for undo and redo
        if (id=="undo" || id=="redo")
        {
            this["cmd_"+id]();
            this.m_textarea.focus();
            return;
        }
    
        // Create an editor state from the current selection
        var state=new EditorState();
        state.InitFromTextArea(this.m_textarea);

        // Create a copy for undo buffer
        var originalState=state.Duplicate();        
        
        // Call the handler and apply changes
        if (this["cmd_"+id](state))
        {
            // Save current state on undo stack
            this.m_undoMode=undomode_unknown;
            this.m_undoStack.splice(this.m_undoPos, this.m_undoStack.length-this.m_undoPos, originalState);        
            this.m_undoPos++;

            // Apply new state
            state.Apply();
            
            // Update markdown rendering
            this.onMarkdownChanged();
            
            return true;
        }
        else
        {
            this.m_textarea.focus();
            return false;
        }
    }
    
    delete priv;
    delete pub;

    // Exports
    this.Editor=Editor;
}();
