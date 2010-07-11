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
	class MoreTestFiles
	{
		public static IEnumerable<TestCaseData> GetTests_mdtest11()
		{
			return Utils.GetTests("mdtest11");
		}


		[Test, TestCaseSource("GetTests_mdtest11")]
		public void Test_mdtest11(string resourceName)
		{
			Utils.RunResourceTest(resourceName);
		}

		public static IEnumerable<TestCaseData> GetTests_mdtest01()
		{
			return Utils.GetTests("mdtest01");
		}


		[Test, TestCaseSource("GetTests_mdtest01")]
		public void Test_mdtest01(string resourceName)
		{
			Utils.RunResourceTest(resourceName);
		}

		/*
		 * Don't run the pandoc test's as they're basically a demonstration of things
		 * that are broken in markdown.
		 * 
		public static IEnumerable<TestCaseData> GetTests_pandoc()
		{
			return Utils.GetTests("pandoc");
		}


		[Test, TestCaseSource("GetTests_pandoc")]
		public void Test_pandoc(string resourceName)
		{
			Utils.RunResourceTest(resourceName);
		}
		 */

		public static IEnumerable<TestCaseData> GetTests_phpmarkdown()
		{
			return Utils.GetTests("phpmarkdown");
		}


		[Test, TestCaseSource("GetTests_phpmarkdown")]
		public void Test_phpmarkdown(string resourceName)
		{
			Utils.RunResourceTest(resourceName);
		}


	}
}
