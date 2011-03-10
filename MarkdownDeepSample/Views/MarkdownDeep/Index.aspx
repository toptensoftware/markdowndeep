<%@ Page Language="C#" MasterPageFile="MarkdownDeep.Master" Inherits="System.Web.Mvc.ViewPage" %>

<asp:Content ID="Content1" ContentPlaceHolderID="TitleContent" runat="server">
    MarkdownDeep Sample Page
</asp:Content>

<asp:Content ID="Content2" ContentPlaceHolderID="MainContent" runat="server">
    <%=ViewData["Content"] %>

	<p><%=Html.ActionLink("Edit this Page", "Edit") %></p>
</asp:Content>
