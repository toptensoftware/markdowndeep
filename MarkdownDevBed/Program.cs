using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using MarkdownDeep;
using System.IO;

namespace MarkdownDevBed
{
	class Program
	{
		static void Main(string[] args)
		{
			Markdown m = new Markdown();
			m.SafeMode = false;
			m.ExtraMode = true;
			m.AutoHeadingIDs = true;
//			m.SectionHeader = "<div class=\"header\">{0}</div>\n";
//			m.SectionHeadingSuffix = "<div class=\"heading\">{0}</div>\n";
//			m.SectionFooter = "<div class=\"footer\">{0}</div>\n\n";
//			m.SectionHeader = "\n<div class=\"section_links\"><a href=\"/edit?section={0}\">Edit</a></div>\n";
//			m.HtmlClassTitledImages = "figure";
//			m.DocumentRoot = "C:\\users\\bradr\\desktop";
//			m.DocumentLocation = "C:\\users\\bradr\\desktop\\100D5000";
//			m.MaxImageWidth = 500;
			m.FormatCodeBlockAttributes = delegate(string language)
			{
				if (language == null)
				{
					var d = m.GetLinkDefinition("default_syntax");
					if (d==null)
						return "";
					language = d.title;
				}
				if (language == "C#")
					language = "csharp";
				if (language == "C++")
					language = "cpp";

				return " class=\"prettyprint lang-"+language.ToLowerInvariant()+"\"";
			};


			string markdown=FileContents("input.txt");
			string str = m.Transform(markdown);
			Console.Write(str);

			var sections = MarkdownDeep.Markdown.SplitSections(markdown);
			for (int i = 0; i < sections.Count; i++)
			{
				Console.WriteLine("---- Section {0} ----", i);
				Console.Write(sections[i]);
				Console.WriteLine("\n");
			}
			Console.WriteLine("------------------");

		}


		/// <summary>
		/// returns the contents of the specified file as a string  
		/// assumes the file is relative to the root of the project
		/// </summary>
		static string FileContents(string filename)
		{
			try
			{
				return File.ReadAllText(Path.Combine(ExecutingAssemblyPath, filename));
			}
			catch (FileNotFoundException)
			{
				return "";
			}

		}

		/// <summary>
		/// returns the root path of the currently executing assembly
		/// </summary>
		static private string ExecutingAssemblyPath
		{
			get
			{
				string path = System.Reflection.Assembly.GetExecutingAssembly().Location;
				// removes executable part
				path = Path.GetDirectoryName(path);
				// we're typically in \bin\debug or bin\release so move up two folders
				path = Path.Combine(path, "..");
				path = Path.Combine(path, "..");
				return path;
			}
		}
	}
}
