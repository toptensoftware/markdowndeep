using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using MarkdownDeep;

namespace MarkdownDeepTests
{
	[TestFixture]
	public class CodeSpanTests
	{
		[SetUp]
		public void SetUp()
		{
			f = new SpanFormatter(new Markdown());
		}

		SpanFormatter f;

		[Test]
		public void SingleTick()
		{
			Assert.AreEqual("pre <code>code span</code> post", 
					f.Format("pre `code span` post"));
		}

		[Test]
		public void SingleTickWithSpaces()
		{
			Assert.AreEqual("pre <code>code span</code> post",
					f.Format("pre ` code span ` post"));
		}

		[Test]
		public void MultiTick()
		{
			Assert.AreEqual("pre <code>code span</code> post",
					f.Format("pre ````code span```` post"));
		}

		[Test]
		public void MultiTickWithEmbeddedTicks()
		{
			Assert.AreEqual("pre <code>`code span`</code> post",
					f.Format("pre ```` `code span` ```` post"));
		}

		[Test]
		public void ContentEncoded()
		{
			Assert.AreEqual("pre <code>&lt;div&gt;</code> post",
					f.Format("pre ```` <div> ```` post"));
			Assert.AreEqual("pre <code>&amp;amp;</code> post",
					f.Format("pre ```` &amp; ```` post"));
		}

	}
}
