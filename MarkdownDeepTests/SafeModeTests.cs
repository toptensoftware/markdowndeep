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
	class SafeModeTests
	{
		public static IEnumerable<TestCaseData> GetTests()
		{
			return Utils.GetTests("safemode");
		}


		[Test, TestCaseSource("GetTests")]
		public void Test(string resourceName)
		{
			Utils.RunResourceTest(resourceName, true);
		}

		[Test, TestCaseSource("GetTests")]
		public void Test_js(string resourceName)
		{
			Utils.RunResourceTestJS(resourceName, true);
		}

	}
}
