using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using MarkdownDeep;
using NUnit.Framework;
using System.Reflection;

namespace MarkdownDeepTests
{
	[TestFixture]
	public class XssAttackTests
	{
		public bool IsTagReallySafe(HtmlTag tag)
		{
			switch (tag.name)
			{
				case "B":
				case "UL":
				case "LI":
				case "I":
					return tag.attributes.Count == 0;

				case "A":
				case "a":
					return tag.closing && tag.attributes.Count == 0;
			}

			return false;
		}


		public static IEnumerable<TestCaseData> GetTestsFromFile(string filename)
		{
			var tests = Utils.LoadTextResource("MarkdownDeepTests.testfiles.xsstests." + filename);

			// Split into lines
			string[] lines = tests.Replace("\r\n", "\n").Split('\n');

			// Join bac
			var strings = new List<string>();
			string str = null;
			foreach (var l in lines)
			{
				// Ignore
				if (l.StartsWith("////"))
					continue;

				// Terminator?
				if (l == "====== UNTESTED ======")
				{
					str = null;
					break;
				}

				// Blank line?
				if (String.IsNullOrEmpty(l.Trim()))
				{
					if (str != null)
						strings.Add(str);
					str = null;

					continue;
				}

				if (str == null)
					str = l;
				else
					str = str + "\n" + l;
			}

			if (str != null)
				strings.Add(str);


			return from s in strings select new TestCaseData(s);
		}

		public static IEnumerable<TestCaseData> GetAttacks()
		{
			return GetTestsFromFile("xss_attacks.txt");
		}


		[Test, TestCaseSource("GetAttacks")]
		public void TestAttacksAreBlocked(string input)
		{
			StringScanner p = new StringScanner(input);

			while (!p.eof)
			{
				HtmlTag tag=HtmlTag.Parse(p);
				if (tag!=null)
				{
					if (tag.IsSafe())
					{
						// There's a few tags that really are safe in the test data
						Assert.IsTrue(IsTagReallySafe(tag));
					}
				}
				else
				{
					// Next character
					p.SkipForward(1);
				}
			}
		}

		public static IEnumerable<TestCaseData> GetAllowed()
		{
			return GetTestsFromFile("non_attacks.txt");
		}


		[Test, TestCaseSource("GetAllowed")]
		public void TestNonAttacksAreAllowed(string input)
		{
			StringScanner p = new StringScanner(input);

			while (!p.eof)
			{
				HtmlTag tag = HtmlTag.Parse(p);
				if (tag != null)
				{
					Assert.IsTrue(tag.IsSafe());
				}
				else
				{
					// Next character
					p.SkipForward(1);
				}
			}
		}

	}
}
