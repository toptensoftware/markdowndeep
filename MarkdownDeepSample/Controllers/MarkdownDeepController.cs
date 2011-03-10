using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace MarkdownDeepSample.Controllers
{
	[HandleError]
	public class MarkdownDeepController : Controller
	{
		/* 
		 * For the purposes of this sample project, the user editable markdown page content is saved 
		 * here in a static variable.  
		 * 
		 * In the real world don't do this... save your stuff to a db or whatever.
		 */
		static string m_Content=
@"# Edit this Page with MarkdownDeep

This demo project shows how to use MarkdownDeep in a typical ASP.NET MVC application.

* Click the *Edit this Page* link below to make changes to this page with MarkdownDeep's editor
* Use the links in the top right for more info.
* Look at the file `MarkdownDeepController.cs` for implementation details.

MarkdownDeep is written by [Topten Software](http://www.toptensoftware.com).  The project home for MarkdownDeep is [here](http://www.toptensoftware.com/markdowndeep).

";

		public ActionResult Index()
		{
			// View the user editable content

			// Create and setup Markdown translator
			var md = new MarkdownDeep.Markdown();
			md.SafeMode = true;
			md.ExtraMode = true;

			// Transform the content and pass to the view
			ViewData["Content"] = md.Transform(m_Content);
			return View();
		}

		[AcceptVerbs(HttpVerbs.Get)]
		public ActionResult Edit()
		{
			// For editing the content, just pass the raw Markdown to the view
			ViewData["content"] = m_Content;
			return View();
		}

		[AcceptVerbs(HttpVerbs.Post)]
		public ActionResult Edit(string content)
		{
			// Save the content and switch back to the main view
			m_Content = content;
			return RedirectToAction("Index");
		}

		public ActionResult About()
		{
			// Nothing special here
			return View();
		}

		public ActionResult QuickRef()
		{
			// This view translates the readme file that is installed by the MarkdownDeep NuGet package.

			// The readme is in Markdown format so this is a good example of just rendering content that
			// has been authored in markdown.

			// The view uses the extension method defined in HtmlHelperExtensions.cs to load and translate
			// a specified file.

			return View();
		}
	}
}
