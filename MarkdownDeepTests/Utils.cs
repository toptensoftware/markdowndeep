using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Reflection;
using NUnit.Framework;
using System.Windows.Forms;

namespace MarkdownDeepTests
{
	public static class Utils
	{
		public static IEnumerable<TestCaseData> GetTests(string foldername)
		{
			var names = Assembly.GetExecutingAssembly().GetManifestResourceNames();

			return from name in Assembly.GetExecutingAssembly().GetManifestResourceNames()
					where name.StartsWith("MarkdownDeepTests.testfiles." + foldername + ".") && (name.EndsWith(".txt") || name.EndsWith(".text"))
					select new TestCaseData(name);
		}

		public static string LoadTextResource(string name)
		{
			// get a reference to the current assembly
			var a = System.Reflection.Assembly.GetExecutingAssembly();
			System.IO.StreamReader r = new System.IO.StreamReader(a.GetManifestResourceStream(name));
			string str = r.ReadToEnd();
			r.Close();

			return str;
		}

	
		public static string strip_redundant_whitespace(string str)
		{
			StringBuilder sb = new StringBuilder();

			str = str.Replace("\r\n", "\n");

			int i = 0;
			while (i < str.Length)
			{
				char ch = str[i];
				switch (ch)
				{
					case ' ':
					case '\t':
					case '\r':
					case '\n':
						// Store start of white space
						i++;

						// Find end of whitespace
						while (i < str.Length)
						{
							ch = str[i];
							if (ch != ' ' && ch != '\t' && ch != '\r' && ch != '\n')
								break;

							i++;
						}


						// Replace with a single space
						if (i < str.Length && str[i] != '<')
							sb.Append(' ');

						break;

					case '>':
						sb.Append("> ");
						i++;
						while (i < str.Length)
						{
							ch = str[i];
							if (ch != ' ' && ch != '\t' && ch != '\r' && ch != '\n')
								break;

							i++;
						}
						break;

					case '<':
						if (i+5<str.Length && str.Substring(i, 5) == "<pre>")
						{
							sb.Append(" ");

							// Special handling for pre blocks

							// Find end
							int end = str.IndexOf("</pre>", i);
							if (end < 0)
								end=str.Length;

							// Append the pre block
							sb.Append(str, i, end - i);
							sb.Append(" ");

							// Jump to end
							i = end;
						}
						else
						{
							sb.Append(" <");
							i++;
						}
						break;

					default:
						sb.Append(ch);
						i++;
						break;
				}
			}

			return sb.ToString().Trim();
		}

		public static void RunResourceTest(string resourceName)
		{
			string input = Utils.LoadTextResource(resourceName);
			string expected = Utils.LoadTextResource(System.IO.Path.ChangeExtension(resourceName, "html"));

			var md = new MarkdownDeep.Markdown();

			string actual = md.Transform(input);
			string actual_clean = Utils.strip_redundant_whitespace(actual);
			string expected_clean = Utils.strip_redundant_whitespace(expected);

			string sep = new string('-', 30) + "\n";

			Console.WriteLine("Input:\n" + sep + input);
			Console.WriteLine("Actual:\n" + sep + actual);
			Console.WriteLine("Expected:\n" + sep + expected);

			Assert.AreEqual(expected_clean, actual_clean);
		}

		public static string TransformUsingJS(string inputText)
		{
			// Find test page
			var url = System.Reflection.Assembly.GetExecutingAssembly().CodeBase;
			url = System.IO.Path.GetDirectoryName(url);
			url = url.Replace("file:\\", "file:\\\\");
			url = url.Replace("\\", "/");
			url = url + "/JSTestResources/JSHost.html";

			// Create browser, navigate and wait
			WebBrowser b = new WebBrowser();
			b.Navigate(url);
			//b.ScriptErrorsSuppressed = true;

			while (b.ReadyState != WebBrowserReadyState.Complete)
			{
				Application.DoEvents();
			}

			/*

			// Get elements
			var input = b.Document.GetElementById("markdown_input");
			var output = b.Document.GetElementById("markdown_output");

			// Set the input text
			input.InnerText = inputText;

			// Run the script
			b.Document.InvokeScript("run");

			// Get the output text
			var result = output.InnerText;
			 */

			var o = b.Document.InvokeScript("transform", new object[] { inputText } );

			string result = o as string;

			// Clean up
			b.Dispose();

			return result;
		}

		public static void RunTestJS(string input)
		{
			string normalized_input = input.Replace("\r\n", "\n").Replace("\r", "\n");

			// Work out the expected output using C# implementation
			var md = new MarkdownDeep.Markdown();
			string expected = md.Transform(normalized_input);

			// Transform using javascript implementation
			string actual = TransformUsingJS(input);

			actual = actual.Replace("\r", "");
			expected = expected.Replace("\r", "");

			string sep = new string('-', 30) + "\n";

			Console.WriteLine("Input:\n" + sep + input);
			Console.WriteLine("Actual:\n" + sep + actual);
			Console.WriteLine("Expected:\n" + sep + expected);

			// Check it
			Assert.AreEqual(expected, actual);
		}

		public static void RunResourceTestJS(string resourceName)
		{
			// Get the input script
			string input = Utils.LoadTextResource(resourceName);
			RunTestJS(input);
		}


	}
}


/*
 * Issues:
 * 
 * 1. Don't allow multiline headings
 * 2. Nested list items without blank line.  Don't join indent to previous if looks like a list item
 * 3. Multiline HTML comments are broken.
 * 4. Reference links where the id is on the next line
 * 5. Formatting in link text  eg: [** link text **](url)
 * 6. Escapes in urls eg: [link](url\(parens\))
 * 7. Link titles with embedded quotes
 * 
*/
