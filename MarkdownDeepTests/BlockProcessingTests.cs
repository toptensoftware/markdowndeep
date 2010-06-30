using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using MarkdownDeep;
using System.Reflection;

namespace MarkdownDeepTests
{
	[TestFixture]
	class BlockProcessingTests
	{
		public static IEnumerable<TestCaseData> GetTests()
		{
			return Utils.GetTests("blocktests");
		}


		[Test, TestCaseSource("GetTests")]
		public void Test(string resourceName)
		{
			string input = Utils.LoadTextResource(resourceName);
			string expected = Utils.LoadTextResource(System.IO.Path.ChangeExtension(resourceName, "html"));

			var md=new Markdown();

			string actual=md.Transform(input);
			string actual_clean = Utils.strip_redundant_whitespace(actual);
			string expected_clean = Utils.strip_redundant_whitespace(expected);

			Console.WriteLine("Actual:\n" + actual);
			Console.WriteLine("Expected:\n" + expected);

			Assert.AreEqual(expected_clean, actual_clean);
		}

	}
}
