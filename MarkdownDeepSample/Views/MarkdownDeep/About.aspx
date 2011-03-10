<%@ Page Language="C#" MasterPageFile="MarkdownDeep.Master" Inherits="System.Web.Mvc.ViewPage" %>

<asp:Content ID="aboutTitle" ContentPlaceHolderID="TitleContent" runat="server">
    About MarkdownDeep
</asp:Content>

<asp:Content ID="aboutContent" ContentPlaceHolderID="MainContent" runat="server">
    <h1>About MarkdownDeep</h1>
<p>MarkdownDeep is an open-source implementation of the increasingly popular web publishing syntax <a href="http://daringfireball.net/projects/markdown/" target="_blank">Markdown</a>. MarkdownDeep provides a high performance implementation for ASP.NET web-servers along with a compatible JavaScript implementation for client side use.</p> 

<p>For more information please see the <%=Html.ActionLink("Quick Reference", "QuickRef") %> and <a href="http://www.toptensoftware.com/markdowndeep">MarkdownDeep Website</a></p>


<% Html.RenderMarkdown("~/Scripts/MarkdownDeep License.txt"); %>
 
 </asp:Content>
