using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.IO;
using System.Diagnostics;
using MarkdownDeep;

namespace MarkdownDeepBenchmark
{
	class Program
	{
		static void Main(string[] args)
		{
			Benchmark();
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

		/// <summary>
		/// executes a standard benchmark on short, medium, and long markdown samples  
		/// use this to verify any impacts of code changes on performance  
		/// please DO NOT MODIFY the input samples or the benchmark itself as this will invalidate previous 
		/// benchmark runs!
		/// </summary>
		static void Benchmark()
		{

			Console.WriteLine();
			Console.WriteLine();
			Console.WriteLine(@"MarkdownDeep benchmark...");
			Console.WriteLine();

			Benchmark(FileContents(Path.Combine("benchmark", "markdown-example-short-1.text")), 4000);
			Benchmark(FileContents(Path.Combine("benchmark", "markdown-example-medium-1.text")), 1000);
			Benchmark(FileContents(Path.Combine("benchmark", "markdown-example-long-2.text")), 100);
			Benchmark(FileContents(Path.Combine("benchmark", "markdown-readme.text")), 1);
			Benchmark(FileContents(Path.Combine("benchmark", "markdown-readme.8.text")), 1);
			Benchmark(FileContents(Path.Combine("benchmark", "markdown-readme.32.text")), 1);
		}

		/// <summary>
		/// performs a rough benchmark of the Markdown engine using small, medium, and large input samples 
		/// please DO NOT MODIFY the input samples or the benchmark itself as this will invalidate previous 
		/// benchmark runs!
		/// </summary>
		static void Benchmark(string text, int iterations)
		{
			var m = new Markdown();

			var sw = new Stopwatch();
			sw.Start();
			for (int i = 0; i < iterations; i++)
				m.Transform(text);
			sw.Stop();

			Console.WriteLine("input string length: " + text.Length);
			Console.Write(iterations + " iteration" + (iterations == 1 ? "" : "s") + " in " + sw.ElapsedMilliseconds + " ms");
			if (iterations == 1)
				Console.WriteLine();
			else
				Console.WriteLine(" (" + Convert.ToDouble(sw.ElapsedMilliseconds) / Convert.ToDouble(iterations) + " ms per iteration)");
		}


	}
}
