using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using MarkdownDeep;

namespace MarkdownDeepTests
{
	[TestFixture]
	public class SpecialCharacterTests
	{
		[SetUp]
		public void SetUp()
		{
			f = new SpanFormatter(new Markdown());
		}

		SpanFormatter f;

		[Test]
		public void SimpleTag()
		{
			Assert.AreEqual(f.Format("pre <a> post"), "pre <a> post");
		}

		[Test]
		public void TagWithAttributes()
		{
			Assert.AreEqual(f.Format("pre <a href=\"somewhere.html\" target=\"_blank\">link</a> post"), "pre <a href=\"somewhere.html\" target=\"_blank\">link</a> post");
		}

		[Test]
		public void NotATag()
		{
			Assert.AreEqual("pre a &lt; b post",
					f.Format("pre a < b post"));
		}

		[Test]
		public void NotATag2()
		{
			Assert.AreEqual("pre a&lt;b post",
					f.Format("pre a<b post"));
		}

		[Test]
		public void AmpersandsInUrls()
		{
			Assert.AreEqual("pre <a href=\"somewhere.html?arg1=a&amp;arg2=b\" target=\"_blank\">link</a> post",
					f.Format("pre <a href=\"somewhere.html?arg1=a&arg2=b\" target=\"_blank\">link</a> post"));
		}

		[Test]
		public void AmpersandsInParagraphs()
		{
			Assert.AreEqual("pre this &amp; that post",
					f.Format("pre this & that post"));
		}

		[Test]
		public void HtmlEntities()
		{
			Assert.AreEqual("pre &amp; post",
					f.Format("pre &amp; post"));
			Assert.AreEqual("pre &#123; post",
					f.Format("pre &#123; post"));
			Assert.AreEqual("pre &#x1aF; post",
					f.Format("pre &#x1aF; post"));
		}


	}
}
