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
			string str=m.Transform(FileContents("input.txt"));
			Console.Write(str);
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
