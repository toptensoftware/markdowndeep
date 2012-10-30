<%@ Page Language="C#" MasterPageFile="MarkdownDeep.Master" Inherits="System.Web.Mvc.ViewPage" %>

<asp:Content ID="Content1" ContentPlaceHolderID="TitleContent" runat="server">
    MarkdownDeep Multiple Editor Sample Page
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="MainContent" runat="server">
    <%=ViewData["Content"] %>
    <%=ViewData["Content2"] %>
    <p><%=Html.ActionLink("Edit this Page", "MultipleEdit") %></p>
</asp:Content>
