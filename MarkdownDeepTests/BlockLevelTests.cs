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
	class BlockLevelTests
	{
		public static IEnumerable<TestCaseData> GetTests()
		{
			return Utils.GetTests("blocktests");
		}


		[Test, TestCaseSource("GetTests")]
		public void Test(string resourceName)
		{
			Utils.RunResourceTest(resourceName);
		}

		[Test, TestCaseSource("GetTests")]
		public void Test_js(string resourceName)
		{
			Utils.RunResourceTestJS(resourceName);
		}


		/*
		[Test]
		public void TestJS()
		{
			Utils.RunTestJS("Paragraph 1\n\nParagraph 2");
		}
		 */
	}
}
