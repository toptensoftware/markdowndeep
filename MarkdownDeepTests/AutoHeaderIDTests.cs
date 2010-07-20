using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using MarkdownDeep;

namespace MarkdownDeepTests
{
	[TestFixture]
	public class AutoHeaderIDTests
	{
		[SetUp]
		public void SetUp()
		{
			m = new Markdown();
			m.AutoHeadingIDs = true;
			m.ExtraMode = true;
		}

		Markdown m;

		/* Tests for pandoc style header ID generation */
		/* Tests are based on the examples in the pandoc documentation */

		[Test]
		public void Simple()
		{
			Assert.AreEqual(@"header-identifiers-in-html",
					m.MakeUniqueHeaderID(@"Header identifiers in HTML"));
		}

		[Test]
		public void WithPunctuation()
		{
			Assert.AreEqual(@"dogs--in-my-house",
					m.MakeUniqueHeaderID(@"Dogs?--in *my* house?"));
		}

		[Test]
		public void WithLinks()
		{
			Assert.AreEqual(@"html-s5-rtf",
					m.MakeUniqueHeaderID(@"[HTML](#html), [S5](#S5), [RTF](#rtf)"));
		}

		[Test]
		public void WithLeadingNumbers()
		{
			Assert.AreEqual(@"applications",
					m.MakeUniqueHeaderID(@"3. Applications"));
		}

		[Test]
		public void RevertToSection()
		{
			Assert.AreEqual(@"section",
					m.MakeUniqueHeaderID(@"!!!"));
		}

		[Test]
		public void Duplicates()
		{
			Assert.AreEqual(@"heading",
					m.MakeUniqueHeaderID(@"heading"));
			Assert.AreEqual(@"heading-1",
					m.MakeUniqueHeaderID(@"heading"));
			Assert.AreEqual(@"heading-2",
					m.MakeUniqueHeaderID(@"heading"));
		}

	}
}