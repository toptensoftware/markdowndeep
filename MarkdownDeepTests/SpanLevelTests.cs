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
	class SpanLevelTests
	{
		public static IEnumerable<TestCaseData> GetTests()
		{
			return Utils.GetTests("spantests");
		}


		[Test, TestCaseSource("GetTests")]
		public void Test(string resourceName)
		{
			Utils.RunResourceTest(resourceName, false);
		}

	}
}
