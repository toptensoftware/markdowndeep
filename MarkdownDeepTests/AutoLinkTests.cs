using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using MarkdownDeep;
using NUnit.Framework;

namespace MarkdownDeepTests
{
	[TestFixture]
	class AutoLinkTests
	{
		[SetUp]
		public void SetUp()
		{
			m = new Markdown();
			s = new SpanFormatter(m);
		}

		[Test]
		public void http()
		{
			Assert.AreEqual("pre <a href=\"http://url.com\">http://url.com</a> post",
					s.Format("pre <http://url.com> post"));
		}

		[Test]
		public void https()
		{
			Assert.AreEqual("pre <a href=\"https://url.com\">https://url.com</a> post",
					s.Format("pre <https://url.com> post"));
		}

		[Test]
		public void ftp()
		{
			Assert.AreEqual("pre <a href=\"ftp://url.com\">ftp://url.com</a> post",
					s.Format("pre <ftp://url.com> post"));
		}

		Markdown m;
		SpanFormatter s;
	}
}
