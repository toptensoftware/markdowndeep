//! MarkdownDeep  http://toptensoftware.com/MarkdownDeep
//! Copyright (C) 2010 Topten Software. Some Rights Reserved

var MarkdownDeepJQuery=new function(){

    // private:priv.
    // private:.m_*
    // private:.m_listType
    // private:.m_prefixLen
    
    this.ToolbarHtml=function()
    {
        str=''; 
        str+='<div class="mdd_modal" id="syntax_container" style="display:none">\n';
        str+='<div class="mdd_modal_frame">\n';
        str+='<div class="mdd_modal_button">\n';
        str+='<a href="#" id="close_help">Close</a>\n';
        str+='</div>\n';
        str+='<div class="mdd_modal_content">\n';
        str+='<div class="mdd_syntax" id="mdd_syntax" src="markdown_help.htm">\n';
        str+='<div class="mdd_ajax_loader"></div>\n';
        str+='</div>\n';
        str+='</div>\n';
        str+='</div>\n';
        str+='</div>\n';
        str+='<div class="mdd_toolbar">\n';
        str+='<ul>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_undo" title="Undo (Ctrl+Z)" tabindex=-1></a></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_redo" title="Redo (Ctrl+Y)" tabindex=-1></a></li>\n';
        str+='<li><span class="mdd_sep"></span></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_heading" title="Change Heading Style (Ctrl+H, or Ctrl+0 to Ctrl+6)" tabindex=-1></a></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_code" title="Preformatted Code (Ctrl+K or Tab/Shift+Tab on multiline selection)" tabindex=-1></a></li>\n';
        str+='<li><span class="mdd_sep"></span></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_bold" title="Bold (Ctrl+B)" tabindex=-1></a></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_italic" title="Italic (Ctrl+I)" tabindex=-1></a></li>\n';
        str+='<li><span class="mdd_sep"></span></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_ullist" title="Bullets (Ctrl+U)" tabindex=-1></a></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_ollist" title="Numbering (Ctrl+O)" tabindex=-1></a></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_outdent" title="Unquote (Ctrl+W)" tabindex=-1></a></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_indent" title="Quote (Ctrl+Q)" tabindex=-1></a></li>\n';
        str+='<li><span class="mdd_sep"></span></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_link" title="Insert Hyperlink (Ctrl+L)" tabindex=-1></a></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_img" title="Insert Image (Ctrl+G)" tabindex=-1></a></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_hr" title="Insert Horizontal Rule (Ctrl+R)" tabindex=-1></a></li>\n';
        str+='</ul>\n';
        str+='<div class="mdd_links">\n';
        str+='<a href="#" id="mdd_help" tabindex=-1>How to Format</a>\n';
        str+='</div>\n';
        str+='<div style="clear:both"></div>\n';
        str+='</div>\n';
        return str;
    }
    
    this.RenderToolbar=function()
    {
        document.write(this.ToolbarHtml());
    }
    
    this.RenderResizeBar=function()
    {
        document.write('<div class="mdd_resizer"><div class="mdd_gripper"></div><div class="mdd_gripper mdd_gripper2"></div></div>');
    }

}();
