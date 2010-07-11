using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using MarkdownDeep;

namespace MarkdownDeepTests
{
	[TestFixture]
	class LinkDefinitionTests
	{
		[SetUp]
		public void Setup()
		{
			r=null;
		}

		[Test]
		public void NoTitle()
		{
			string str = "[id]: url.com";
			r = LinkDefinition.ParseLinkDefinition(str);

			Assert.IsNotNull(r);
			Assert.AreEqual(r.id, "id");
			Assert.AreEqual(r.url, "url.com");
			Assert.AreEqual(r.title, null);
		}

		[Test]
		public void DoubleQuoteTitle()
		{
			string str = "[id]: url.com \"my title\"";
			r = LinkDefinition.ParseLinkDefinition(str);

			Assert.IsNotNull(r);
			Assert.AreEqual(r.id, "id");
			Assert.AreEqual(r.url, "url.com");
			Assert.AreEqual(r.title, "my title");
		}

		[Test]
		public void SingleQuoteTitle()
		{
			string str = "[id]: url.com \'my title\'";
			r = LinkDefinition.ParseLinkDefinition(str);

			Assert.IsNotNull(r);
			Assert.AreEqual(r.id, "id");
			Assert.AreEqual(r.url, "url.com");
			Assert.AreEqual(r.title, "my title");
		}

		[Test]
		public void ParenthesizedTitle()
		{
			string str = "[id]: url.com (my title)";
			r = LinkDefinition.ParseLinkDefinition(str);

			Assert.IsNotNull(r);
			Assert.AreEqual(r.id, "id");
			Assert.AreEqual(r.url, "url.com");
			Assert.AreEqual(r.title, "my title");
		}

		[Test]
		public void AngleBracketedUrl()
		{
			string str = "[id]: <url.com> (my title)";
			r = LinkDefinition.ParseLinkDefinition(str);

			Assert.IsNotNull(r);
			Assert.AreEqual(r.id, "id");
			Assert.AreEqual(r.url, "url.com");
			Assert.AreEqual(r.title, "my title");
		}

		[Test]
		public void MultiLine()
		{
			string str = "[id]:\n\t     http://www.site.com \n\t      (my title)";
			r = LinkDefinition.ParseLinkDefinition(str);

			Assert.IsNotNull(r);
			Assert.AreEqual(r.id, "id");
			Assert.AreEqual(r.url, "http://www.site.com");
			Assert.AreEqual(r.title, "my title");
		}

		[Test]
		public void Invalid()
		{
			Assert.IsNull(LinkDefinition.ParseLinkDefinition("[id"));
			Assert.IsNull(LinkDefinition.ParseLinkDefinition("[id]"));
			Assert.IsNull(LinkDefinition.ParseLinkDefinition("[id]:"));
			Assert.IsNull(LinkDefinition.ParseLinkDefinition("[id]: <url"));
			Assert.IsNull(LinkDefinition.ParseLinkDefinition("[id]: <url> \"title"));
			Assert.IsNull(LinkDefinition.ParseLinkDefinition("[id]: <url> \'title"));
			Assert.IsNull(LinkDefinition.ParseLinkDefinition("[id]: <url> (title"));
			Assert.IsNull(LinkDefinition.ParseLinkDefinition("[id]: <url> \"title\" crap"));
			Assert.IsNull(LinkDefinition.ParseLinkDefinition("[id]: <url> crap"));
		}

		LinkDefinition r;
	}

}
